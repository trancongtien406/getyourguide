import { PromoScope, PromoType } from '@prisma/client';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsEnum(PromoType)
  promoType!: PromoType;

  @IsEnum(PromoScope)
  promoScope!: PromoScope;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'currencyCode must be uppercase token format',
  })
  @MaxLength(10)
  currencyCode?: string;
}
