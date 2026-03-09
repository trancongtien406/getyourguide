import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingExpirationService {
  private readonly logger = new Logger(BookingExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every 5 minutes to expire PENDING_PAYMENT bookings past their expiresAt.
   * Releases held inventory and sets booking status to EXPIRED.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirePendingBookings() {
    const now = new Date();

    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: { lte: now },
      },
      select: { id: true, bookingRef: true },
      take: 100, // Process in batches
    });

    if (expiredBookings.length === 0) return;

    this.logger.log(`Found ${expiredBookings.length} expired bookings to process`);

    for (const booking of expiredBookings) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Get booking items to release inventory
          const bookingItems = await tx.bookingItem.findMany({
            where: { bookingId: booking.id },
            select: { inventorySlotId: true, quantity: true },
          });

          // Release inventory by incrementing available slots
          for (const item of bookingItems) {
            if (item.inventorySlotId) {
              await tx.inventorySlot.update({
                where: { id: item.inventorySlotId },
                data: {
                  bookedCapacity: { decrement: item.quantity },
                },
              });
            }
          }

          // Release any inventory holds
          await tx.inventoryHold.updateMany({
            where: { bookingId: booking.id, releasedAt: null },
            data: { releasedAt: now },
          });

          // Update booking status to EXPIRED
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'EXPIRED' },
          });

          // Create booking event
          await tx.bookingEvent.create({
            data: {
              bookingId: booking.id,
              eventType: 'EXPIRED',
              payload: { reason: 'Booking expired due to payment timeout' },
            },
          });
        });

        this.logger.log(`Expired booking ${booking.bookingRef}`);
      } catch (error) {
        this.logger.error(`Failed to expire booking ${booking.bookingRef}`, error instanceof Error ? error.stack : error);
      }
    }

    this.logger.log(`Processed ${expiredBookings.length} expired bookings`);
  }
}
