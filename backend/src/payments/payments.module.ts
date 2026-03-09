import { Module } from '@nestjs/common';
import { MomoGateway, PAYMENT_GATEWAYS, VnpayGateway } from './gateways';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    VnpayGateway,
    MomoGateway,
    {
      provide: PAYMENT_GATEWAYS,
      useFactory: (vnpay: VnpayGateway, momo: MomoGateway) => [vnpay, momo],
      inject: [VnpayGateway, MomoGateway],
    },
    PaymentsService,
  ],
})
export class PaymentsModule {}
