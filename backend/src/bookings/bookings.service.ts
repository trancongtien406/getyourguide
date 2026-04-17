import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  DepartureSlotStatus,
  Prisma,
  TourStatus,
  UserRole,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { GuestBookingTokenService } from '../common/services/guest-booking-token.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListAllBookingsDto } from './dto/list-all-bookings.dto';
import { ListMyBookingsDto } from './dto/list-my-bookings.dto';
import { ListSupplierBookingsDto } from './dto/list-supplier-bookings.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guestBookingToken: GuestBookingTokenService,
  ) {}

  private resolveMyBookingsOrderBy(
    query: ListMyBookingsDto,
  ): Prisma.BookingOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'bookingref':
        return [{ bookingRef: sortOrder }, { createdAt: 'desc' }];
      case 'status':
        return [{ status: sortOrder }, { createdAt: 'desc' }];
      case 'totalamount':
        return [{ totalAmount: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async createBooking(actor: JwtPayload, dto: CreateBookingDto) {
    const departure = await this.prisma.departureSlot.findUnique({
      where: { id: dto.departureSlotId },
    });
    if (!departure) {
      throw new NotFoundException('Departure slot not found');
    }

    if (departure.status !== DepartureSlotStatus.ACTIVE) {
      throw new BadRequestException('Departure slot is not bookable');
    }

    const option = await this.prisma.tourOption.findUnique({
      where: { id: departure.tourOptionId },
    });
    if (!option || !option.isActive) {
      throw new BadRequestException('Tour option is not available');
    }

    const tour = await this.prisma.tour.findUnique({
      where: { id: option.tourId },
    });
    if (!tour || tour.status !== TourStatus.PUBLISHED) {
      throw new BadRequestException('Tour is not available for booking');
    }

    if (option.maxParticipants && dto.quantity > option.maxParticipants) {
      throw new BadRequestException(
        'Quantity exceeds option maximum participants',
      );
    }

    const now = new Date();
    const pricingRule = await this.prisma.optionPricingRule.findFirst({
      where: {
        tourOptionId: option.id,
        componentType: 'BASE',
        currencyCode: dto.currencyCode.toUpperCase(),
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gt: now } }],
      },
      orderBy: [{ validFrom: 'desc' }],
    });

    if (!pricingRule) {
      throw new BadRequestException('No valid pricing rule found');
    }

    const inventory = await this.prisma.inventorySlot.findUnique({
      where: { departureSlotId: departure.id },
    });
    if (!inventory) {
      throw new BadRequestException('Inventory is missing for departure slot');
    }

    const available =
      inventory.totalCapacity +
      inventory.oversellLimit -
      inventory.heldCapacity -
      inventory.bookedCapacity;

    if (available < dto.quantity) {
      throw new BadRequestException('Not enough available slots');
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.booking.findFirst({
        where: {
          idempotencyKey: dto.idempotencyKey,
          userId: actor.sub,
        },
      });

      if (existing) {
        return existing;
      }
    }

    const unitPrice = pricingRule.amount;
    const lineTotal = unitPrice.mul(dto.quantity);

    return this.prisma.$transaction(async (tx) => {
      const latestInventory = await tx.inventorySlot.findUnique({
        where: { departureSlotId: departure.id },
      });
      if (!latestInventory) {
        throw new BadRequestException('Inventory not found');
      }

      const latestAvailable =
        latestInventory.totalCapacity +
        latestInventory.oversellLimit -
        latestInventory.heldCapacity -
        latestInventory.bookedCapacity;

      if (latestAvailable < dto.quantity) {
        throw new BadRequestException('Not enough available slots');
      }

      // Optimistic locking on inventory slot to avoid overselling under concurrency
      try {
        await tx.inventorySlot.update({
          where: { id: latestInventory.id, version: latestInventory.version },
          data: {
            bookedCapacity: {
              increment: dto.quantity,
            },
            version: {
              increment: 1,
            },
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          // Inventory was modified concurrently; treat as not enough capacity
          throw new BadRequestException('Not enough available slots');
        }
        throw error;
      }

      const booking = await tx.booking.create({
        data: {
          bookingRef: this.generateBookingRef(),
          userId: actor.sub,
          supplierId: tour.supplierId,
          status: BookingStatus.PENDING_PAYMENT,
          currencyCode: dto.currencyCode.toUpperCase(),
          subtotalAmount: lineTotal,
          totalAmount: lineTotal,
          contactEmail: dto.contactEmail,
          contactPhoneE164: dto.contactPhoneE164,
          notes: dto.notes,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      await tx.bookingItem.create({
        data: {
          bookingId: booking.id,
          tourId: tour.id,
          tourOptionId: option.id,
          departureSlotId: departure.id,
          inventorySlotId: latestInventory.id,
          titleSnapshot: tour.title,
          optionSnapshot: option.title,
          startsAtSnapshot: departure.startsAt,
          travelerMix: (dto.travelerMix ?? []) as Prisma.JsonArray,
          languageCode: dto.languageCode ?? null,
          quantity: dto.quantity,
          unitPrice,
          lineTotal,
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: 'BOOKING_PENDING_PAYMENT',
          payload: {
            source: 'api',
          },
          createdBy: actor.sub,
        },
      });

      return booking;
    });
  }

  async listMyBookings(actor: JwtPayload, query: ListMyBookingsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BookingWhereInput = {
      userId: actor.sub,
      status: query.status,
      ...(query.q
        ? {
            OR: [
              { bookingRef: { contains: query.q, mode: 'insensitive' } },
              { contactEmail: { contains: query.q, mode: 'insensitive' } },
              { contactPhoneE164: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: { items: true },
        orderBy: this.resolveMyBookingsOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async getBookingById(actor: JwtPayload, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.ensureCanAccessBooking(actor, booking.id);

    const items = await this.prisma.bookingItem.findMany({
      where: { bookingId: booking.id },
      orderBy: [{ createdAt: 'asc' }],
    });

    return {
      ...booking,
      items,
    };
  }

  /**
   * Public lookup for guest bookings (userId is null).
   * Only returns bookings that have no userId assigned.
   */
  async getGuestBookingById(bookingId: string, guestToken?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only allow access to guest bookings (no userId)
    if (booking.userId !== null) {
      throw new ForbiddenException('Access denied');
    }

    this.guestBookingToken.assertValidForBooking(guestToken, booking.id);

    const items = await this.prisma.bookingItem.findMany({
      where: { bookingId: booking.id },
      orderBy: [{ createdAt: 'asc' }],
    });

    return {
      ...booking,
      items,
    };
  }

  async cancelBooking(
    actor: JwtPayload,
    bookingId: string,
    dto: CancelBookingDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.ensureCanAccessBooking(actor, booking.id);

    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.PENDING_PAYMENT
    ) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    const bookingItems = await this.prisma.bookingItem.findMany({
      where: { bookingId },
    });

    const cancelStatus =
      actor.sub === booking.userId
        ? BookingStatus.CANCELLED_BY_CUSTOMER
        : BookingStatus.CANCELLED_BY_OPERATOR;

    return this.prisma.$transaction(async (tx) => {
      for (const item of bookingItems) {
        if (item.inventorySlotId) {
          await tx.inventorySlot.update({
            where: { id: item.inventorySlotId },
            data: {
              bookedCapacity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: cancelStatus,
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId,
          eventType: 'BOOKING_CANCELLED',
          payload: {
            reason: dto.reason,
          },
          createdBy: actor.sub,
        },
      });

      return updated;
    });
  }

  private async ensureCanAccessBooking(actor: JwtPayload, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const actorRoles = new Set(actor.roles);

    if (booking.userId === actor.sub) {
      return;
    }

    if (actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR)) {
      return;
    }

    if (
      actorRoles.has(UserRole.SUPPLIER_ADMIN) ||
      actorRoles.has(UserRole.SUPPLIER_STAFF)
    ) {
      if (!booking.supplierId) {
        throw new ForbiddenException('Insufficient permissions');
      }

      const membership = await this.prisma.supplierUser.findFirst({
        where: {
          supplierId: booking.supplierId,
          userId: actor.sub,
        },
      });

      if (membership) {
        return;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private generateBookingRef() {
    return `BK-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;
  }

  async listSupplierBookings(
    actor: JwtPayload,
    query: ListSupplierBookingsDto,
  ) {
    const actorRoles = new Set(actor.roles);
    if (
      !actorRoles.has(UserRole.SUPPLIER_ADMIN) &&
      !actorRoles.has(UserRole.SUPPLIER_STAFF)
    ) {
      throw new ForbiddenException('Only suppliers can access this endpoint');
    }

    // Find which suppliers this user belongs to
    const memberships = await this.prisma.supplierUser.findMany({
      where: { userId: actor.sub },
      select: { supplierId: true },
    });

    if (memberships.length === 0) {
      return { page: 1, pageSize: query.pageSize ?? 20, total: 0, items: [] };
    }

    const supplierIds = memberships.map((m) => m.supplierId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BookingWhereInput = {
      supplierId: { in: supplierIds },
      ...(query.status && { status: query.status }),
      ...(query.q && {
        OR: [
          { bookingRef: { contains: query.q, mode: 'insensitive' } },
          { contactEmail: { contains: query.q, mode: 'insensitive' } },
          { contactPhoneE164: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: {
          items: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async listAllBookings(actor: JwtPayload, query: ListAllBookingsDto) {
    // Only admin/operator can list all bookings
    const actorRoles = new Set(actor.roles);
    if (!actorRoles.has(UserRole.ADMIN) && !actorRoles.has(UserRole.OPERATOR)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BookingWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: query.userId }),
      ...(query.supplierId && { supplierId: query.supplierId }),
      ...(query.dateFrom && { createdAt: { gte: new Date(query.dateFrom) } }),
      ...(query.dateTo && { createdAt: { lte: new Date(query.dateTo) } }),
      ...(query.q && {
        OR: [
          { bookingRef: { contains: query.q, mode: 'insensitive' } },
          { contactEmail: { contains: query.q, mode: 'insensitive' } },
          { contactPhoneE164: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: {
          items: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }
}
