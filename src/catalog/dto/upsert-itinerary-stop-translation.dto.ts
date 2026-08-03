import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertItineraryStopTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string;

  @IsString()
  @MaxLength(250)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
