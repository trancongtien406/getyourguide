import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @IsString()
  @MaxLength(120)
  name: string;
}
