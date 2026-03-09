import { Body, Controller, Post } from '@nestjs/common';
import { CartsService } from './carts.service';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';

@Controller('cart')
export class GuestCartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post('guest-checkout')
  guestCheckout(@Body() dto: GuestCheckoutDto) {
    return this.cartsService.guestCheckout(dto);
  }
}
