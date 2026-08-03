import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { ListTagsDto } from './dto/list-tags.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { UpsertCategoryTranslationDto } from './dto/upsert-category-translation.dto';
import { UpsertTagTranslationDto } from './dto/upsert-tag-translation.dto';

@Injectable()
export class CatalogTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveCategoryOrderBy(
    query: ListCategoriesDto,
  ): Prisma.CategoryOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'asc';
    switch (query.sortBy) {
      case 'name':
        return [{ name: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: query.sortOrder ?? 'desc' }];
      case 'sortorder':
        return [{ sortOrder: sortOrder }, { createdAt: 'desc' }];
      default:
        return [{ sortOrder: 'asc' }, { createdAt: 'desc' }];
    }
  }

  private resolveTagOrderBy(
    query: ListTagsDto,
  ): Prisma.TourTagOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'name':
        return [{ name: sortOrder }, { createdAt: 'desc' }];
      case 'slug':
        return [{ slug: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async listCategories(query: ListCategoriesDto, lang?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const includeInactive = query.includeInactive ?? false;

    const where: Prisma.CategoryWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        orderBy: this.resolveCategoryOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let localizedItems = items;
    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.categoryTranslation.findMany({
        where: { categoryId: { in: ids }, languageCode: lang },
      });
      const transMap = new Map(
        translations.map((t) => [t.categoryId, t] as const),
      );
      localizedItems = items.map((item) => {
        const tr = transMap.get(item.id);
        if (!tr) {
          return item;
        }
        return {
          ...item,
          name: tr.name,
          ...(tr.description ? { description: tr.description } : {}),
        };
      });
    }

    return { page, pageSize, total, items: localizedItems };
  }

  async createCategory(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          parentId: dto.parentId,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
      });
    } catch (error) {
      this.handleUniqueError(error, 'Category slug already exists');
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          slug: dto.slug,
          name: dto.name,
          parentId: dto.parentId,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
      });
    } catch (error) {
      this.handleNotFoundOrUniqueError(
        error,
        'Category not found',
        'Category slug already exists',
      );
    }
  }

  async listTags(query: ListTagsDto, lang?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.TourTagWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { slug: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      this.prisma.tourTag.count({ where }),
      this.prisma.tourTag.findMany({
        where,
        orderBy: this.resolveTagOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let localizedItems = items;
    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.tourTagTranslation.findMany({
        where: { tagId: { in: ids }, languageCode: lang },
      });
      const transMap = new Map(translations.map((t) => [t.tagId, t] as const));
      localizedItems = items.map((item) => {
        const tr = transMap.get(item.id);
        if (!tr) {
          return item;
        }
        return {
          ...item,
          name: tr.name,
        };
      });
    }

    return { page, pageSize, total, items: localizedItems };
  }

  async createTag(dto: CreateTagDto) {
    try {
      return await this.prisma.tourTag.create({
        data: {
          slug: dto.slug,
          name: dto.name,
        },
      });
    } catch (error) {
      this.handleUniqueError(error, 'Tag slug already exists');
    }
  }

  async updateTag(id: string, dto: UpdateTagDto) {
    try {
      return await this.prisma.tourTag.update({
        where: { id },
        data: {
          slug: dto.slug,
          name: dto.name,
        },
      });
    } catch (error) {
      this.handleNotFoundOrUniqueError(
        error,
        'Tag not found',
        'Tag slug already exists',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Category Translations
  // ─────────────────────────────────────────────────────────────────────

  async getCategoryTranslations(categoryId: string) {
    const exists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!exists) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma.categoryTranslation.findMany({
      where: { categoryId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertCategoryTranslation(
    categoryId: string,
    dto: UpsertCategoryTranslationDto,
  ) {
    const exists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!exists) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma.categoryTranslation.upsert({
      where: {
        categoryId_languageCode: {
          categoryId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        name: dto.name,
        description: dto.description,
      },
      create: {
        categoryId,
        languageCode: dto.languageCode,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async deleteCategoryTranslation(categoryId: string, languageCode: string) {
    try {
      return await this.prisma.categoryTranslation.delete({
        where: {
          categoryId_languageCode: {
            categoryId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Tag Translations
  // ─────────────────────────────────────────────────────────────────────

  async getTagTranslations(tagId: string) {
    const exists = await this.prisma.tourTag.findUnique({
      where: { id: tagId },
    });
    if (!exists) {
      throw new NotFoundException('Tag not found');
    }
    return this.prisma.tourTagTranslation.findMany({
      where: { tagId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertTagTranslation(tagId: string, dto: UpsertTagTranslationDto) {
    const exists = await this.prisma.tourTag.findUnique({
      where: { id: tagId },
    });
    if (!exists) {
      throw new NotFoundException('Tag not found');
    }
    return this.prisma.tourTagTranslation.upsert({
      where: {
        tagId_languageCode: {
          tagId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        name: dto.name,
      },
      create: {
        tagId,
        languageCode: dto.languageCode,
        name: dto.name,
      },
    });
  }

  async deleteTagTranslation(tagId: string, languageCode: string) {
    try {
      return await this.prisma.tourTagTranslation.delete({
        where: {
          tagId_languageCode: {
            tagId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  private handleUniqueError(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }

  private handleNotFoundOrUniqueError(
    error: unknown,
    notFoundMessage: string,
    uniqueMessage: string,
  ): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException(notFoundMessage);
      }
      if (error.code === 'P2002') {
        throw new ConflictException(uniqueMessage);
      }
    }
    throw error;
  }
}
