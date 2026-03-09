import { IsString, MaxLength } from 'class-validator';

export class UpsertCountryTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string;

  @IsString()
  @MaxLength(100)
  name: string;
}
