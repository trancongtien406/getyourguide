import { IsOptional, IsString, Matches } from 'class-validator';

export class PaymentOptionsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;
}
