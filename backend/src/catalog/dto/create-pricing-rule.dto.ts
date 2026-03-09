import { PriceComponentType } from '@prisma/client';
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreatePricingRuleDto {
  @IsEnum(PriceComponentType)
  componentType: PriceComponentType;

  @IsOptional()
  @IsString()
  travelerType?: string;

  @IsString()
  currencyCode: string;

  @IsString()
  amount: string;

  @IsDateString()
  validFrom: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;
}
