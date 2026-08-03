import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertTourOptionTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
