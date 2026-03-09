import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Locale, type RequestLocale } from '../common/decorators/locale.decorator';
import { BlogService } from './blog.service';
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

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('categories')
  listCategories(@Query() query: BlogListTaxonomyDto, @Locale() locale: RequestLocale) {
    return this.blogService.listCategories(query, locale.language);
  }

  @Get('tags')
  listTags(@Query() query: BlogListTaxonomyDto, @Locale() locale: RequestLocale) {
    return this.blogService.listTags(query, locale.language);
  }

  @Get('posts')
  listPostsPublic(@Query() query: BlogListPostsDto, @Locale() locale: RequestLocale) {
    return this.blogService.listPostsPublic(query, locale.language);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/posts')
  listPostsAdmin(@CurrentUser() actor: JwtPayload, @Query() query: BlogListPostsDto) {
    return this.blogService.listPostsAdmin(actor, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/posts/:id')
  getPostByIdAdmin(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.blogService.getPostByIdAdmin(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/posts/:id/translations')
  getPostTranslations(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.blogService.getPostTranslations(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/categories')
  createCategory(@CurrentUser() actor: JwtPayload, @Body() dto: CreateBlogCategoryDto) {
    return this.blogService.createCategory(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/categories/:id')
  updateCategory(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBlogCategoryDto,
  ) {
    return this.blogService.updateCategory(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/categories/:id')
  deleteCategory(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.blogService.deleteCategory(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/tags')
  createTag(@CurrentUser() actor: JwtPayload, @Body() dto: CreateBlogTagDto) {
    return this.blogService.createTag(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/tags/:id')
  updateTag(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBlogTagDto,
  ) {
    return this.blogService.updateTag(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/tags/:id')
  deleteTag(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.blogService.deleteTag(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/posts')
  createPost(@CurrentUser() actor: JwtPayload, @Body() dto: CreateBlogPostDto) {
    return this.blogService.createPost(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/posts/:id')
  updatePost(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blogService.updatePost(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/posts/:id')
  deletePost(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.blogService.deletePost(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/posts/:id/tags')
  setPostTags(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetBlogPostTagsDto,
  ) {
    return this.blogService.setPostTags(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/posts/:id/related-tours')
  setPostRelatedTours(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetBlogPostRelatedToursDto,
  ) {
    return this.blogService.setPostRelatedTours(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/posts/:id/translations')
  upsertPostTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpsertBlogPostTranslationDto,
  ) {
    return this.blogService.upsertPostTranslation(actor, id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Category Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('categories/:id/translations')
  getCategoryTranslations(@Param('id') id: string) {
    return this.blogService.getCategoryTranslations(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/categories/:id/translations')
  upsertCategoryTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpsertBlogCategoryTranslationDto,
  ) {
    return this.blogService.upsertCategoryTranslation(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/categories/:id/translations/:languageCode')
  deleteCategoryTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.blogService.deleteCategoryTranslation(actor, id, languageCode);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Tag Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('tags/:id/translations')
  getTagTranslations(@Param('id') id: string) {
    return this.blogService.getTagTranslations(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/tags/:id/translations')
  upsertTagTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpsertBlogTagTranslationDto,
  ) {
    return this.blogService.upsertTagTranslation(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/tags/:id/translations/:languageCode')
  deleteTagTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.blogService.deleteTagTranslation(actor, id, languageCode);
  }

  @Get('posts/:slug')
  getPostBySlug(@Param('slug') slug: string, @Locale() locale: RequestLocale) {
    return this.blogService.getPostBySlug(slug, locale.language);
  }
}
