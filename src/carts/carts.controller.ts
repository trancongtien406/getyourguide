import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CartsService } from './carts.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  getMyCart(@CurrentUser() actor: JwtPayload) {
    return this.cartsService.getMyCart(actor);
  }

  @Post('items')
  addItem(@CurrentUser() actor: JwtPayload, @Body() dto: AddCartItemDto) {
    return this.cartsService.addItem(actor, dto);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(actor, id, dto);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.cartsService.removeItem(actor, id);
  }

  @Delete('items')
  clearMyCart(@CurrentUser() actor: JwtPayload) {
    return this.cartsService.clearMyCart(actor);
  }

  @Post('checkout')
  checkout(@CurrentUser() actor: JwtPayload, @Body() dto: CheckoutCartDto) {
    return this.cartsService.checkout(actor, dto);
  }
}
