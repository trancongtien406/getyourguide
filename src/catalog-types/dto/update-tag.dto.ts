import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
