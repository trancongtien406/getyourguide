import { Global, Module } from '@nestjs/common';
import { CurrencyConverterService } from './services/currency-converter.service';
import { GuestBookingTokenService } from './services/guest-booking-token.service';
import { MailService } from './services/mail.service';

@Global()
@Module({
  providers: [CurrencyConverterService, MailService, GuestBookingTokenService],
  exports: [CurrencyConverterService, MailService, GuestBookingTokenService],
})
export class CommonModule {}
