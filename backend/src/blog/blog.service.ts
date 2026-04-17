import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogPostStatus, Prisma, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { BlogListPostsDto } from './dto/blog-list-posts.dto';
import { BlogListTaxonomyDto } from './dto/blog-list-taxonomy.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { SetBlogPostRelatedToursDto } from './dto/set-blog-post-related-tours.dto';
import { SetBlogPostTagsDto } from './dto/set-blog-post-tags.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { UpdateBlogTagDto } from './dto/update-blog-tag.dto';
import { UpsertBlogCategoryTranslationDto } from './dto/upsert-blog-category-translation.dto';
import { UpsertBlogPostTranslationDto } from './dto/upsert-blog-post-translation.dto';
import { UpsertBlogTagTranslationDto } from './dto/upsert-blog-tag-translation.dto';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveCategoryOrderBy(
    query: BlogListTaxonomyDto,
  ): Prisma.BlogCategoryOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'asc';
    switch (query.sortBy) {
      case 'name':
        return [{ name: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: query.sortOrder ?? 'desc' }];
      case 'sortorder':
        return [{ sortOrder }, { createdAt: 'desc' }];
      default:
        return [{ sortOrder: 'asc' }, { createdAt: 'desc' }];
    }
  }

  private resolveTagOrderBy(
    query: BlogListTaxonomyDto,
  ): Prisma.BlogTagOrderByWithRelationInput[] {
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

  private resolvePostOrderBy(
    query: BlogListPostsDto,
    isPublic: boolean,
  ): Prisma.BlogPostOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'title':
        return [{ title: sortOrder }, { createdAt: 'desc' }];
      case 'viewcount':
        return [{ viewCount: sortOrder }, { createdAt: 'desc' }];
      case 'publishedat':
        return [{ publishedAt: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return isPublic
          ? [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];
    }
  }

  async listCategories(query: BlogListTaxonomyDto, lang?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BlogCategoryWhereInput = {
      ...(query.includeInactive ? {} : { isActive: true }),
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
      this.prisma.blogCategory.count({ where }),
      this.prisma.blogCategory.findMany({
        where,
        orderBy: this.resolveCategoryOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let localizedItems = items;
    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.blogCategoryTranslation.findMany({
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

  async listTags(query: BlogListTaxonomyDto, lang?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BlogTagWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { slug: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      this.prisma.blogTag.count({ where }),
      this.prisma.blogTag.findMany({
        where,
        orderBy: this.resolveTagOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let localizedItems = items;
    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.blogTagTranslation.findMany({
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

  async listPostsPublic(query: BlogListPostsDto, lang?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const now = new Date();

    const where: Prisma.BlogPostWhereInput = {
      status: BlogPostStatus.PUBLISHED,
      publishedAt: { lte: now },
      categoryId: query.categoryId,
      isFeatured: query.featured,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { excerpt: { contains: query.q, mode: 'insensitive' } },
              { content: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.tagId
        ? {
            tags: {
              some: {
                tagId: query.tagId,
              },
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        orderBy: this.resolvePostOrderBy(query, true),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let localizedItems = items;
    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.blogPostTranslation.findMany({
        where: { postId: { in: ids }, languageCode: lang },
      });
      const transMap = new Map(translations.map((t) => [t.postId, t] as const));
      localizedItems = items.map((item) => {
        const tr = transMap.get(item.id);
        if (!tr) {
          return item;
        }
        return {
          ...item,
          title: tr.title,
          ...(tr.excerpt ? { excerpt: tr.excerpt } : {}),
          ...(tr.content ? { content: tr.content } : {}),
        };
      });
    }

    return {
      page,
      pageSize,
      total,
      items: localizedItems,
    };
  }

  async listPostsAdmin(actor: JwtPayload, query: BlogListPostsDto) {
    this.ensureCanManageContent(actor);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.BlogPostWhereInput = {
      status: query.status,
      categoryId: query.categoryId,
      isFeatured: query.featured,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { excerpt: { contains: query.q, mode: 'insensitive' } },
              { content: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.tagId
        ? {
            tags: {
              some: {
                tagId: query.tagId,
              },
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        orderBy: this.resolvePostOrderBy(query, false),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async getPostBySlug(slug: string, lang?: string | null) {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        status: BlogPostStatus.PUBLISHED,
        publishedAt: { lte: new Date() },
      },
    });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.prisma.blogPost.update({
      where: { id: post.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return this.getPostDetailById(post.id, lang);
  }

  async getPostByIdAdmin(actor: JwtPayload, postId: string) {
    this.ensureCanManageContent(actor);
    return this.getPostDetailById(postId);
  }

  async getPostTranslations(actor: JwtPayload, postId: string) {
    this.ensureCanManageContent(actor);
    await this.ensurePostExists(postId);
    return this.prisma.blogPostTranslation.findMany({
      where: { postId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async createCategory(actor: JwtPayload, dto: CreateBlogCategoryDto) {
    this.ensureCanManageContent(actor);

    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId);
    }

    try {
      return await this.prisma.blogCategory.create({
        data: {
          parentId: dto.parentId,
          slug: dto.slug,
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Blog category slug already exists');
    }
  }

  async updateCategory(
    actor: JwtPayload,
    categoryId: string,
    dto: UpdateBlogCategoryDto,
  ) {
    this.ensureCanManageContent(actor);
    await this.ensureCategoryExists(categoryId);

    if (dto.parentId) {
      if (dto.parentId === categoryId) {
        throw new BadRequestException('Category parent cannot be itself');
      }
      await this.ensureCategoryExists(dto.parentId);
    }

    try {
      return await this.prisma.blogCategory.update({
        where: { id: categoryId },
        data: {
          parentId: dto.parentId,
          slug: dto.slug,
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Blog category slug already exists');
    }
  }

  async deleteCategory(actor: JwtPayload, categoryId: string) {
    this.ensureCanManageContent(actor);
    await this.ensureCategoryExists(categoryId);

    const postCount = await this.prisma.blogPost.count({
      where: { categoryId },
    });
    if (postCount > 0) {
      throw new BadRequestException(
        'Cannot delete category used by blog posts',
      );
    }

    await this.prisma.blogCategory.delete({ where: { id: categoryId } });
    return { message: 'Category deleted' };
  }

  async createTag(actor: JwtPayload, dto: CreateBlogTagDto) {
    this.ensureCanManageContent(actor);
    try {
      return await this.prisma.blogTag.create({
        data: {
          slug: dto.slug,
          name: dto.name,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Blog tag slug already exists');
    }
  }

  async updateTag(actor: JwtPayload, tagId: string, dto: UpdateBlogTagDto) {
    this.ensureCanManageContent(actor);
    await this.ensureTagExists(tagId);
    try {
      return await this.prisma.blogTag.update({
        where: { id: tagId },
        data: {
          slug: dto.slug,
          name: dto.name,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Blog tag slug already exists');
    }
  }

  async deleteTag(actor: JwtPayload, tagId: string) {
    this.ensureCanManageContent(actor);
    await this.ensureTagExists(tagId);

    await this.prisma.$transaction(async (tx) => {
      await tx.blogPostTag.deleteMany({ where: { tagId } });
      await tx.blogTag.delete({ where: { id: tagId } });
    });

    return { message: 'Tag deleted' };
  }

  async createPost(actor: JwtPayload, dto: CreateBlogPostDto) {
    this.ensureCanManageContent(actor);
    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    try {
      return await this.prisma.blogPost.create({
        data: {
          authorUserId: actor.sub,
          categoryId: dto.categoryId,
          slug: dto.slug,
          title: dto.title,
          excerpt: dto.excerpt,
          content: dto.content,
          coverImageUrl: dto.coverImageUrl,
          status: dto.status ?? BlogPostStatus.DRAFT,
          isFeatured: dto.isFeatured,
          seoTitle: dto.seoTitle,
          seoDescription: dto.seoDescription,
          seoKeywords: dto.seoKeywords ?? [],
          canonicalUrl: dto.canonicalUrl,
          noindex: dto.noindex,
          readTimeMinutes: dto.readTimeMinutes,
          publishedAt:
            dto.status === BlogPostStatus.PUBLISHED
              ? dto.publishedAt
                ? new Date(dto.publishedAt)
                : new Date()
              : undefined,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Blog post slug already exists');
    }
  }

  async updatePost(actor: JwtPayload, postId: string, dto: UpdateBlogPostDto) {
    this.ensureCanManageContent(actor);
    const existing = await this.ensurePostExists(postId);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const nextStatus = dto.status ?? existing.status;

    try {
      return await this.prisma.blogPost.update({
        where: { id: postId },
        data: {
          categoryId: dto.categoryId,
          slug: dto.slug,
          title: dto.title,
          excerpt: dto.excerpt,
          content: dto.content,
          coverImageUrl: dto.coverImageUrl,
          status: dto.status,
          isFeatured: dto.isFeatured,
          seoTitle: dto.seoTitle,
          seoDescription: dto.seoDescription,
          seoKeywords: dto.seoKeywords,
          canonicalUrl: dto.canonicalUrl,
          noindex: dto.noindex,
          readTimeMinutes: dto.readTimeMinutes,
          publishedAt:
            nextStatus === BlogPostStatus.PUBLISHED
              ? dto.publishedAt
                ? new Date(dto.publishedAt)
                : (existing.publishedAt ?? new Date())
              : dto.status
                ? null
                : undefined,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Blog post slug already exists');
    }
  }

  async deletePost(actor: JwtPayload, postId: string) {
    this.ensureCanManageContent(actor);
    await this.ensurePostExists(postId);

    await this.prisma.$transaction(async (tx) => {
      await tx.blogPostTranslation.deleteMany({ where: { postId } });
      await tx.blogPostTag.deleteMany({ where: { postId } });
      await tx.blogPostRelatedTour.deleteMany({ where: { postId } });
      await tx.blogPost.delete({ where: { id: postId } });
    });

    return { message: 'Blog post deleted' };
  }

  async setPostTags(
    actor: JwtPayload,
    postId: string,
    dto: SetBlogPostTagsDto,
  ) {
    this.ensureCanManageContent(actor);
    await this.ensurePostExists(postId);

    if (dto.tagIds.length) {
      const count = await this.prisma.blogTag.count({
        where: { id: { in: dto.tagIds } },
      });
      if (count !== dto.tagIds.length) {
        throw new NotFoundException('One or more tags were not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.blogPostTag.deleteMany({ where: { postId } });
      if (dto.tagIds.length) {
        await tx.blogPostTag.createMany({
          data: dto.tagIds.map((tagId) => ({ postId, tagId })),
        });
      }
    });

    return this.getPostDetailById(postId);
  }

  async setPostRelatedTours(
    actor: JwtPayload,
    postId: string,
    dto: SetBlogPostRelatedToursDto,
  ) {
    this.ensureCanManageContent(actor);
    await this.ensurePostExists(postId);

    if (dto.items.length) {
      const tourIds = dto.items.map((item) => item.tourId);
      const count = await this.prisma.tour.count({
        where: { id: { in: tourIds } },
      });
      if (count !== tourIds.length) {
        throw new NotFoundException('One or more tours were not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.blogPostRelatedTour.deleteMany({ where: { postId } });
      if (dto.items.length) {
        await tx.blogPostRelatedTour.createMany({
          data: dto.items.map((item, index) => ({
            postId,
            tourId: item.tourId,
            sortOrder: item.sortOrder ?? index,
          })),
        });
      }
    });

    return this.getPostDetailById(postId);
  }

  async upsertPostTranslation(
    actor: JwtPayload,
    postId: string,
    dto: UpsertBlogPostTranslationDto,
  ) {
    this.ensureCanManageContent(actor);
    await this.ensurePostExists(postId);

    return this.prisma.blogPostTranslation.upsert({
      where: {
        postId_languageCode: {
          postId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
      },
      create: {
        postId,
        languageCode: dto.languageCode,
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
      },
    });
  }

  private async getPostDetailById(postId: string, lang?: string | null) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const [tags, relatedTours, translations] = await Promise.all([
      this.prisma.blogPostTag.findMany({
        where: { postId },
        orderBy: [{ tagId: 'asc' }],
      }),
      this.prisma.blogPostRelatedTour.findMany({
        where: { postId },
        orderBy: [{ sortOrder: 'asc' }, { tourId: 'asc' }],
      }),
      this.prisma.blogPostTranslation.findMany({
        where: { postId },
        orderBy: [{ languageCode: 'asc' }],
      }),
    ]);

    // Overlay translation for specific language
    let overlay: Record<string, unknown> = {};
    if (lang) {
      const tr = translations.find((t) => t.languageCode === lang);
      if (tr) {
        overlay = {
          title: tr.title,
          ...(tr.excerpt && { excerpt: tr.excerpt }),
          ...(tr.content && { content: tr.content }),
          ...(tr.seoTitle && { seoTitle: tr.seoTitle }),
          ...(tr.seoDescription && { seoDescription: tr.seoDescription }),
        };
      }
    }

    return {
      ...post,
      ...overlay,
      tags,
      relatedTours,
      translations,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Blog Category Translations
  // ─────────────────────────────────────────────────────────────────────

  async getCategoryTranslations(categoryId: string) {
    await this.ensureCategoryExists(categoryId);
    return this.prisma.blogCategoryTranslation.findMany({
      where: { categoryId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertCategoryTranslation(
    actor: JwtPayload,
    categoryId: string,
    dto: UpsertBlogCategoryTranslationDto,
  ) {
    this.ensureCanManageContent(actor);
    await this.ensureCategoryExists(categoryId);

    return this.prisma.blogCategoryTranslation.upsert({
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

  async deleteCategoryTranslation(
    actor: JwtPayload,
    categoryId: string,
    languageCode: string,
  ) {
    this.ensureCanManageContent(actor);
    await this.ensureCategoryExists(categoryId);

    try {
      return await this.prisma.blogCategoryTranslation.delete({
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
  // Blog Tag Translations
  // ─────────────────────────────────────────────────────────────────────

  async getTagTranslations(tagId: string) {
    await this.ensureTagExists(tagId);
    return this.prisma.blogTagTranslation.findMany({
      where: { tagId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertTagTranslation(
    actor: JwtPayload,
    tagId: string,
    dto: UpsertBlogTagTranslationDto,
  ) {
    this.ensureCanManageContent(actor);
    await this.ensureTagExists(tagId);

    return this.prisma.blogTagTranslation.upsert({
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

  async deleteTagTranslation(
    actor: JwtPayload,
    tagId: string,
    languageCode: string,
  ) {
    this.ensureCanManageContent(actor);
    await this.ensureTagExists(tagId);

    try {
      return await this.prisma.blogTagTranslation.delete({
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

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Blog category not found');
    }
    return category;
  }

  private async ensureTagExists(tagId: string) {
    const tag = await this.prisma.blogTag.findUnique({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException('Blog tag not found');
    }
    return tag;
  }

  private async ensurePostExists(postId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  private ensureCanManageContent(actor: JwtPayload) {
    const actorRoles = new Set(actor.roles);
    if (actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR)) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private handleKnownPrismaError(
    error: unknown,
    conflictMessage: string,
  ): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(conflictMessage);
    }

    throw error;
  }
}
