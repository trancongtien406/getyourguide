import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

export class UpdateCurrencyDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  symbol?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  decimals?: number;
}
