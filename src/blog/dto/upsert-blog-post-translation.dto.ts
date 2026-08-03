import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertBlogPostTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;
}
