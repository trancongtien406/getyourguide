import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertTourTranslationDto {
  @IsString()
  @MaxLength(10)
  languageCode: string;

  @IsString()
  @MaxLength(250)
  title: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  fullDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedItems?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedItems?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatToBring?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  importantInfo?: string[];
}
