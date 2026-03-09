import { IsString, MaxLength } from 'class-validator';

export class CreateBlogTagDto {
  @IsString()
  @MaxLength(120)
  slug!: string;

  @IsString()
  @MaxLength(255)
  name!: string;
}
