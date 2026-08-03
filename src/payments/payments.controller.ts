import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { InitiateGuestPaymentDto } from './dto/initiate-guest-payment.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentOptionsQueryDto } from './dto/payment-options-query.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('options')
  getPaymentOptions(@Query() query: PaymentOptionsQueryDto) {
    return this.paymentsService.getPaymentOptions(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('vnpay/create')
  createVnpayPayment(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: InitiatePaymentDto,
    @Req() req: Request,
  ) {
    const forwardedIp = req.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedIp)
      ? forwardedIp[0]
      : forwardedIp?.split(',')[0]?.trim() || req.ip || '127.0.0.1';

    return this.paymentsService.initiateVnpayPayment(actor, dto, clientIp);
  }

  @UseGuards(JwtAuthGuard)
  @Post('momo/create')
  createMomoPayment(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiateMomoPayment(actor, dto);
  }

  @Post('guest/vnpay/create')
  createGuestVnpayPayment(
    @Body() dto: InitiateGuestPaymentDto,
    @Req() req: Request,
  ) {
    const forwardedIp = req.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedIp)
      ? forwardedIp[0]
      : forwardedIp?.split(',')[0]?.trim() || req.ip || '127.0.0.1';

    return this.paymentsService.initiateGuestVnpayPayment(dto, clientIp);
  }

  @Post('guest/momo/create')
  createGuestMomoPayment(@Body() dto: InitiateGuestPaymentDto) {
    return this.paymentsService.initiateGuestMomoPayment(dto);
  }

  @Get('vnpay/ipn')
  handleVnpayIpn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  @Post('momo/ipn')
  handleMomoIpn(@Body() payload: Record<string, unknown>) {
    return this.paymentsService.handleMomoIpn(payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get('admin/settings')
  getAdminSettings() {
    return this.paymentsService.getAdminSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/settings')
  updateAdminSettings(@Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentsService.updateAdminSettings(dto);
  }
}
