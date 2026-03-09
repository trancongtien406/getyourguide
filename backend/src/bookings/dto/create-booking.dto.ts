import {
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  departureSlotId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsArray()
  travelerMix?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhoneE164?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
