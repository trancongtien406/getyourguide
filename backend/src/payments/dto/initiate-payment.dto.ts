import {
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;
}
