import { IsNotEmpty, IsString } from 'class-validator';
import { InitiatePaymentDto } from './initiate-payment.dto';

export class InitiateGuestPaymentDto extends InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  guestAccessToken: string;
}
