import { Module } from '@nestjs/common';
import { BookingExpirationService } from './booking-expiration.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpirationService],
})
export class BookingsModule {}
