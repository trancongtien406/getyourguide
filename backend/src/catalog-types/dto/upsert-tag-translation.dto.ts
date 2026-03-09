import { IsString, MaxLength } from 'class-validator';

export class UpsertTagTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string;

  @IsString()
  @MaxLength(50)
  name: string;
}
