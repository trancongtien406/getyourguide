import { IsString, IsUUID, MaxLength } from 'class-validator';

export class RedeemPromotionDto {
  @IsUUID()
  bookingId!: string;

  @IsString()
  @MaxLength(64)
  code!: string;
}
