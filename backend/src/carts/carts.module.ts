import { Module } from '@nestjs/common';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { GuestCartsController } from './guest-carts.controller';

@Module({
  controllers: [CartsController, GuestCartsController],
  providers: [CartsService],
})
export class CartsModule {}
