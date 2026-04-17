import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateExchangeRateDto {
  @IsString()
  @Length(3, 3)
  baseCurrency!: string;

  @IsString()
  @Length(3, 3)
  quoteCurrency!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 10 })
  @Min(0.0000000001)
  rate!: number;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}
