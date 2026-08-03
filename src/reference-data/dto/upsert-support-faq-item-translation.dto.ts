import { IsString, MaxLength } from 'class-validator';

export class UpsertSupportFaqItemTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string;

  @IsString()
  @MaxLength(500)
  question: string;

  @IsString()
  answer: string;
}
