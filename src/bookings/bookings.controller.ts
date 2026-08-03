import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BookingsService } from './bookings.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListAllBookingsDto } from './dto/list-all-bookings.dto';
import { ListMyBookingsDto } from './dto/list-my-bookings.dto';
import { ListSupplierBookingsDto } from './dto/list-supplier-bookings.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createBooking(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  listMyBookings(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListMyBookingsDto,
  ) {
    return this.bookingsService.listMyBookings(actor, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('supplier')
  listSupplierBookings(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListSupplierBookingsDto,
  ) {
    return this.bookingsService.listSupplierBookings(actor, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  listAllBookings(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListAllBookingsDto,
  ) {
    return this.bookingsService.listAllBookings(actor, query);
  }

  @Get('guest/:id')
  getGuestBookingById(
    @Param('id') id: string,
    @Query('token') queryToken?: string,
    @Headers('x-guest-booking-token') headerToken?: string,
  ) {
    return this.bookingsService.getGuestBookingById(
      id,
      queryToken ?? headerToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getBookingById(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.getBookingById(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancelBooking(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(actor, id, dto);
  }
}
