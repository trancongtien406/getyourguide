import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  @Length(2, 10)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
