import {
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Min,
} from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  departureSlotId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode!: string;

  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsArray()
  travelerMix?: Array<Record<string, unknown>>;
}
