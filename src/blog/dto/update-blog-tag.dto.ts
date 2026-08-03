import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBlogTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
