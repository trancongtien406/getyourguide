import { Global, Module } from '@nestjs/common';
import { CurrencyConverterService } from './services/currency-converter.service';
import { MailService } from './services/mail.service';

@Global()
@Module({
  providers: [CurrencyConverterService, MailService],
  exports: [CurrencyConverterService, MailService],
})
export class CommonModule {}

