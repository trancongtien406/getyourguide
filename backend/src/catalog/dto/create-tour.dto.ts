import { InventoryMode, Prisma, TourStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTourDto {
  @IsUUID()
  supplierId: string;

  @IsUUID()
  cityId: string;

  @IsString()
  @MaxLength(160)
  slug: string;

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
  @IsString()
  meetingPoint?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxGroupSize?: number;

  @IsOptional()
  @IsEnum(InventoryMode)
  inventoryMode?: InventoryMode;

  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatToBring?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  importantInfo?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableLanguages?: string[];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  badgeText?: string;

  @IsOptional()
  @IsBoolean()
  allowPayLater?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultLanguageCode?: string;

  @IsOptional()
  cancellationPolicy?: Prisma.InputJsonValue;
}
