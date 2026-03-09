import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Locale, type RequestLocale } from '../common/decorators/locale.decorator';
import { CatalogTypesService } from './catalog-types.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { ListTagsDto } from './dto/list-tags.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { UpsertCategoryTranslationDto } from './dto/upsert-category-translation.dto';
import { UpsertTagTranslationDto } from './dto/upsert-tag-translation.dto';

@Controller('catalog/types')
export class CatalogTypesController {
  constructor(private readonly catalogTypesService: CatalogTypesService) {}

  @Get('categories')
  listCategories(@Query() query: ListCategoriesDto, @Locale() locale: RequestLocale) {
    return this.catalogTypesService.listCategories(query, locale.language);
  }

  @Get('tags')
  listTags(@Query() query: ListTagsDto, @Locale() locale: RequestLocale) {
    return this.catalogTypesService.listTags(query, locale.language);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogTypesService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogTypesService.updateCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('tags')
  createTag(@Body() dto: CreateTagDto) {
    return this.catalogTypesService.createTag(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch('tags/:id')
  updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.catalogTypesService.updateTag(id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Category Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('categories/:id/translations')
  getCategoryTranslations(@Param('id') id: string) {
    return this.catalogTypesService.getCategoryTranslations(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Put('categories/:id/translations')
  upsertCategoryTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertCategoryTranslationDto,
  ) {
    return this.catalogTypesService.upsertCategoryTranslation(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('categories/:id/translations/:languageCode')
  deleteCategoryTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.catalogTypesService.deleteCategoryTranslation(id, languageCode);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Tag Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('tags/:id/translations')
  getTagTranslations(@Param('id') id: string) {
    return this.catalogTypesService.getTagTranslations(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Put('tags/:id/translations')
  upsertTagTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertTagTranslationDto,
  ) {
    return this.catalogTypesService.upsertTagTranslation(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('tags/:id/translations/:languageCode')
  deleteTagTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.catalogTypesService.deleteTagTranslation(id, languageCode);
  }
}
