import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  DepartureSlotStatus,
  Prisma,
  PromoScope,
  PromoType,
  TourStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrencyConverterService } from '../common/services/currency-converter.service';
import { GuestBookingTokenService } from '../common/services/guest-booking-token.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type ValidatedCartItem = {
  departureSlotId: string;
  quantity: number;
  travelerMix: Prisma.JsonValue;
  languageCode: string | null;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  optionId: string;
  optionTitle: string;
  tourId: string;
  tourTitle: string;
  supplierId: string;
  startsAt: Date;
};

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverterService,
    private readonly guestBookingToken: GuestBookingTokenService,
  ) {}

  async getMyCart(actor: JwtPayload) {
    const cart = await this.prisma.bookingCart.findFirst({
      where: { userId: actor.sub },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!cart) {
      return null;
    }

    const items = await this.prisma.bookingCartItem.findMany({
      where: { cartId: cart.id },
      orderBy: [{ addedAt: 'asc' }],
    });

    const enrichedItems = await this.enrichCartItems(cart.currencyCode, items);

    return {
      ...cart,
      items: enrichedItems,
    };
  }

  async addItem(actor: JwtPayload, dto: AddCartItemDto) {
    const currencyCode = dto.currencyCode.toUpperCase();
    const pricing = await this.getCurrentPricing(
      dto.departureSlotId,
      dto.quantity,
      currencyCode,
    );

    const cart = await this.getOrCreateCart(actor.sub, currencyCode);

    if (cart.currencyCode !== currencyCode) {
      throw new BadRequestException('Cart currency mismatch');
    }

    const existing = await this.prisma.bookingCartItem.findFirst({
      where: {
        cartId: cart.id,
        departureSlotId: dto.departureSlotId,
      },
    });

    const nextQuantity = existing
      ? existing.quantity + dto.quantity
      : dto.quantity;
    const nextLineTotal = pricing.unitPrice.mul(nextQuantity);

    if (existing) {
      await this.prisma.bookingCartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQuantity,
          unitPrice: pricing.unitPrice,
          totalPrice: nextLineTotal,
          travelerMix: (dto.travelerMix ??
            existing.travelerMix) as Prisma.JsonArray,
          languageCode: dto.languageCode ?? existing.languageCode ?? null,
        },
      });
    } else {
      await this.prisma.bookingCartItem.create({
        data: {
          cartId: cart.id,
          departureSlotId: dto.departureSlotId,
          quantity: dto.quantity,
          unitPrice: pricing.unitPrice,
          totalPrice: pricing.unitPrice.mul(dto.quantity),
          travelerMix: (dto.travelerMix ?? []) as Prisma.JsonArray,
          languageCode: dto.languageCode ?? null,
        },
      });
    }

    await this.prisma.bookingCart.update({
      where: { id: cart.id },
      data: {
        expiresAt: this.defaultCartExpiry(),
      },
    });

    return this.getMyCart(actor);
  }

  async updateItem(actor: JwtPayload, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getRequiredCart(actor.sub);

    const item = await this.prisma.bookingCartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const quantity = dto.quantity ?? item.quantity;
    const pricing = await this.getCurrentPricing(
      item.departureSlotId,
      quantity,
      cart.currencyCode,
    );

    await this.prisma.bookingCartItem.update({
      where: { id: item.id },
      data: {
        quantity,
        unitPrice: pricing.unitPrice,
        totalPrice: pricing.unitPrice.mul(quantity),
        travelerMix: (dto.travelerMix ?? item.travelerMix) as Prisma.JsonArray,
        // languageCode is not updated here; it stays as originally selected
      },
    });

    return this.getMyCart(actor);
  }

  async removeItem(actor: JwtPayload, itemId: string) {
    const cart = await this.getRequiredCart(actor.sub);

    await this.prisma.bookingCartItem.deleteMany({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    return this.getMyCart(actor);
  }

  async clearMyCart(actor: JwtPayload) {
    const cart = await this.getRequiredCart(actor.sub);
    await this.prisma.bookingCartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getMyCart(actor);
  }

  async checkout(actor: JwtPayload, dto: CheckoutCartDto) {
    const cart = await this.getRequiredCart(actor.sub);

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

    const cartItems = await this.prisma.bookingCartItem.findMany({
      where: { cartId: cart.id },
      orderBy: [{ addedAt: 'asc' }],
    });

    if (!cartItems.length) {
      throw new BadRequestException('Cart is empty');
    }

    const validatedItems: ValidatedCartItem[] = [];
    for (const item of cartItems) {
      const validated = await this.validateCheckoutItem(
        item.departureSlotId,
        item.quantity,
        cart.currencyCode,
        item.travelerMix,
        item.languageCode ?? null,
      );
      validatedItems.push(validated);
    }

    const supplierIds = new Set(validatedItems.map((item) => item.supplierId));
    if (supplierIds.size !== 1) {
      throw new BadRequestException(
        'Cart checkout supports a single supplier per booking',
      );
    }

    const subtotal = validatedItems.reduce(
      (sum, item) => sum.plus(item.lineTotal),
      new Prisma.Decimal(0),
    );

    return this.prisma.$transaction(async (tx) => {
      for (const item of validatedItems) {
        const inventory = await tx.inventorySlot.findUnique({
          where: { departureSlotId: item.departureSlotId },
        });
        if (!inventory) {
          throw new BadRequestException(
            'Inventory is missing for departure slot',
          );
        }

        const available =
          inventory.totalCapacity +
          inventory.oversellLimit -
          inventory.heldCapacity -
          inventory.bookedCapacity;

        if (available < item.quantity) {
          throw new BadRequestException(
            'Not enough available slots for checkout',
          );
        }

        await tx.inventorySlot.update({
          where: { departureSlotId: item.departureSlotId },
          data: {
            bookedCapacity: {
              increment: item.quantity,
            },
          },
        });
      }

      const booking = await tx.booking.create({
        data: {
          bookingRef: this.generateBookingRef(),
          userId: actor.sub,
          supplierId: validatedItems[0].supplierId,
          status: BookingStatus.PENDING_PAYMENT,
          currencyCode: cart.currencyCode,
          subtotalAmount: subtotal,
          totalAmount: subtotal,
          contactEmail: dto.contactEmail,
          contactPhoneE164: dto.contactPhoneE164,
          notes: dto.notes,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      for (const item of validatedItems) {
        const inventory = await tx.inventorySlot.findUnique({
          where: { departureSlotId: item.departureSlotId },
        });

        await tx.bookingItem.create({
          data: {
            bookingId: booking.id,
            tourId: item.tourId,
            tourOptionId: item.optionId,
            departureSlotId: item.departureSlotId,
            inventorySlotId: inventory?.id,
            titleSnapshot: item.tourTitle,
            optionSnapshot: item.optionTitle,
            startsAtSnapshot: item.startsAt,
            travelerMix: item.travelerMix as Prisma.JsonArray,
            languageCode: item.languageCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          },
        });
      }

      if (dto.promotionCode) {
        await this.applyPromotionDuringCheckout(
          tx,
          actor.sub,
          booking.id,
          booking.supplierId,
          booking.subtotalAmount,
          booking.currencyCode,
          validatedItems,
          dto.promotionCode,
        );
      }

      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: 'BOOKING_CREATED_FROM_CART',
          payload: {
            cartId: cart.id,
            itemCount: validatedItems.length,
          },
          createdBy: actor.sub,
        },
      });

      await tx.bookingCartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return booking;
    });
  }

  /* ─── Guest Checkout (no authentication required) ─── */
  async guestCheckout(dto: GuestCheckoutDto) {
    if (!dto.items.length) {
      throw new BadRequestException('No items provided');
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.booking.findFirst({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return {
          ...existing,
          guestAccessToken: this.guestBookingToken.createToken(existing.id),
        };
      }
    }

    const validatedItems: ValidatedCartItem[] = [];
    for (const item of dto.items) {
      const validated = await this.validateCheckoutItem(
        item.departureSlotId,
        item.quantity,
        dto.currencyCode,
        (item.travelerMix ?? []) as Prisma.JsonValue,
        (item.languageCode as string | null) ?? null,
      );
      validatedItems.push(validated);
    }

    const supplierIds = new Set(validatedItems.map((item) => item.supplierId));
    if (supplierIds.size !== 1) {
      throw new BadRequestException(
        'Guest checkout supports a single supplier per booking',
      );
    }

    const subtotal = validatedItems.reduce(
      (sum, item) => sum.plus(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const booking = await this.prisma.$transaction(async (tx) => {
      for (const item of validatedItems) {
        const inventory = await tx.inventorySlot.findUnique({
          where: { departureSlotId: item.departureSlotId },
        });
        if (!inventory) {
          throw new BadRequestException(
            'Inventory is missing for departure slot',
          );
        }

        const available =
          inventory.totalCapacity +
          inventory.oversellLimit -
          inventory.heldCapacity -
          inventory.bookedCapacity;

        if (available < item.quantity) {
          throw new BadRequestException(
            'Not enough available slots for checkout',
          );
        }

        await tx.inventorySlot.update({
          where: { departureSlotId: item.departureSlotId },
          data: {
            bookedCapacity: { increment: item.quantity },
          },
        });
      }

      const booking = await tx.booking.create({
        data: {
          bookingRef: this.generateBookingRef(),
          userId: null,
          supplierId: validatedItems[0].supplierId,
          status: BookingStatus.PENDING_PAYMENT,
          currencyCode: dto.currencyCode,
          subtotalAmount: subtotal,
          totalAmount: subtotal,
          contactEmail: dto.contactEmail,
          contactPhoneE164: dto.contactPhoneE164,
          notes: dto.notes,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      for (const item of validatedItems) {
        const inventory = await tx.inventorySlot.findUnique({
          where: { departureSlotId: item.departureSlotId },
        });

        await tx.bookingItem.create({
          data: {
            bookingId: booking.id,
            tourId: item.tourId,
            tourOptionId: item.optionId,
            departureSlotId: item.departureSlotId,
            inventorySlotId: inventory?.id,
            titleSnapshot: item.tourTitle,
            optionSnapshot: item.optionTitle,
            startsAtSnapshot: item.startsAt,
            travelerMix: item.travelerMix as Prisma.JsonArray,
            languageCode: item.languageCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          },
        });
      }

      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: 'GUEST_BOOKING_CREATED',
          payload: {
            contactEmail: dto.contactEmail,
            itemCount: validatedItems.length,
          } as unknown as Prisma.JsonObject,
          createdBy: null,
        },
      });

      return booking;
    });

    return {
      ...booking,
      guestAccessToken: this.guestBookingToken.createToken(booking.id),
    };
  }

  private async applyPromotionDuringCheckout(
    tx: Prisma.TransactionClient,
    userId: string,
    bookingId: string,
    supplierId: string | null,
    subtotalAmount: Prisma.Decimal,
    currencyCode: string,
    bookingItems: ValidatedCartItem[],
    promotionCode: string,
  ) {
    const promotion = await tx.promotion.findFirst({
      where: { code: promotionCode.toUpperCase() },
    });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    const scopeEntries = await tx.promotionScopeEntry.findMany({
      where: { promotionId: promotion.id },
    });

    this.validatePromotionForCheckout(
      promotion,
      supplierId,
      subtotalAmount,
      bookingItems,
      scopeEntries,
      currencyCode,
    );

    const [totalUsage, userUsage] = await Promise.all([
      tx.promotionRedemption.count({ where: { promotionId: promotion.id } }),
      tx.promotionRedemption.count({
        where: {
          promotionId: promotion.id,
          userId,
        },
      }),
    ]);

    if (
      promotion.usageLimitTotal !== null &&
      totalUsage >= promotion.usageLimitTotal
    ) {
      throw new BadRequestException('Promotion usage limit exceeded');
    }

    if (
      promotion.usageLimitPerUser !== null &&
      userUsage >= promotion.usageLimitPerUser
    ) {
      throw new BadRequestException('Promotion per-user limit exceeded');
    }

    const discountAmount = this.calculatePromotionDiscount(
      promotion,
      subtotalAmount,
    );
    if (discountAmount.lte(0)) {
      throw new BadRequestException('Promotion discount is not applicable');
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        discountAmount,
        totalAmount: subtotalAmount.sub(discountAmount),
      },
    });

    await tx.promotionRedemption.create({
      data: {
        promotionId: promotion.id,
        bookingId,
        userId,
        discountAmount,
      },
    });

    await tx.bookingEvent.create({
      data: {
        bookingId,
        eventType: 'PROMOTION_APPLIED',
        payload: {
          code: promotion.code,
          discountAmount: discountAmount.toString(),
        } as unknown as Prisma.JsonObject,
        createdBy: userId,
      },
    });
  }

  private validatePromotionForCheckout(
    promotion: {
      startsAt: Date;
      endsAt: Date | null;
      isActive: boolean;
      minOrderAmount: Prisma.Decimal | null;
      promoScope: PromoScope;
      metadata: Prisma.JsonValue;
    },
    supplierId: string | null,
    subtotalAmount: Prisma.Decimal,
    bookingItems: ValidatedCartItem[],
    scopeEntries: Array<{
      supplierId: string | null;
      tourId: string | null;
      tourOptionId: string | null;
    }>,
    bookingCurrency: string,
  ) {
    if (!promotion.isActive) {
      throw new BadRequestException('Promotion is inactive');
    }

    const now = new Date();
    if (promotion.startsAt > now) {
      throw new BadRequestException('Promotion has not started yet');
    }
    if (promotion.endsAt && promotion.endsAt < now) {
      throw new BadRequestException('Promotion has expired');
    }

    if (
      promotion.minOrderAmount &&
      subtotalAmount.lt(promotion.minOrderAmount)
    ) {
      throw new BadRequestException(
        'Booking subtotal does not meet minimum order amount',
      );
    }

    const metadata = (promotion.metadata ?? {}) as { currencyCode?: string };
    if (metadata.currencyCode && metadata.currencyCode !== bookingCurrency) {
      throw new BadRequestException(
        'Promotion is not valid for booking currency',
      );
    }

    if (promotion.promoScope === PromoScope.GLOBAL) {
      return;
    }

    if (!scopeEntries.length) {
      throw new BadRequestException('Promotion scope is not configured');
    }

    if (promotion.promoScope === PromoScope.SUPPLIER) {
      if (
        !supplierId ||
        !scopeEntries.some((entry) => entry.supplierId === supplierId)
      ) {
        throw new BadRequestException(
          'Promotion does not apply to this supplier',
        );
      }
      return;
    }

    if (promotion.promoScope === PromoScope.TOUR) {
      const tourIds = new Set(
        scopeEntries.map((entry) => entry.tourId).filter(Boolean),
      );
      if (!bookingItems.some((item) => tourIds.has(item.tourId))) {
        throw new BadRequestException(
          'Promotion does not apply to booking tours',
        );
      }
      return;
    }

    const optionIds = new Set(
      scopeEntries.map((entry) => entry.tourOptionId).filter(Boolean),
    );
    if (!bookingItems.some((item) => optionIds.has(item.optionId))) {
      throw new BadRequestException(
        'Promotion does not apply to booking options',
      );
    }
  }

  private calculatePromotionDiscount(
    promotion: {
      promoType: PromoType;
      value: Prisma.Decimal;
      maxDiscountAmount: Prisma.Decimal | null;
    },
    subtotal: Prisma.Decimal,
  ) {
    let discount = new Prisma.Decimal(0);
    if (promotion.promoType === PromoType.PERCENT) {
      discount = subtotal.mul(promotion.value).div(100);
    } else {
      discount = promotion.value;
    }

    if (
      promotion.maxDiscountAmount &&
      discount.gt(promotion.maxDiscountAmount)
    ) {
      discount = promotion.maxDiscountAmount;
    }

    if (discount.gt(subtotal)) {
      discount = subtotal;
    }

    return discount;
  }

  private async validateCheckoutItem(
    departureSlotId: string,
    quantity: number,
    currencyCode: string,
    travelerMix: Prisma.JsonValue,
    languageCode: string | null,
  ): Promise<ValidatedCartItem> {
    const departure = await this.prisma.departureSlot.findUnique({
      where: { id: departureSlotId },
    });
    if (!departure || departure.status !== DepartureSlotStatus.ACTIVE) {
      throw new BadRequestException('Departure slot is not bookable');
    }

    const option = await this.prisma.tourOption.findUnique({
      where: { id: departure.tourOptionId },
    });
    if (!option || !option.isActive) {
      throw new BadRequestException('Tour option is not available');
    }

    if (option.maxParticipants && quantity > option.maxParticipants) {
      throw new BadRequestException(
        'Quantity exceeds option maximum participants',
      );
    }

    const tour = await this.prisma.tour.findUnique({
      where: { id: option.tourId },
    });
    if (!tour || tour.status !== TourStatus.PUBLISHED) {
      throw new BadRequestException('Tour is not available for booking');
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

    if (available < quantity) {
      throw new BadRequestException('Not enough available slots');
    }

    const pricing = await this.getCurrentPricing(
      departure.id,
      quantity,
      currencyCode,
    );

    return {
      departureSlotId: departure.id,
      quantity,
      travelerMix,
      languageCode,
      unitPrice: pricing.unitPrice,
      lineTotal: pricing.unitPrice.mul(quantity),
      optionId: option.id,
      optionTitle: option.title,
      tourId: tour.id,
      tourTitle: tour.title,
      supplierId: tour.supplierId,
      startsAt: departure.startsAt,
    };
  }

  private async enrichCartItems(
    currencyCode: string,
    items: Array<{
      id: string;
      cartId: string;
      departureSlotId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      travelerMix: Prisma.JsonValue;
      languageCode: string | null;
      addedAt: Date;
    }>,
  ) {
    if (!items.length) {
      return items;
    }

    const departureSlotIds = Array.from(
      new Set(items.map((item) => item.departureSlotId)),
    );

    const departures = await this.prisma.departureSlot.findMany({
      where: { id: { in: departureSlotIds } },
      select: {
        id: true,
        tourOptionId: true,
        startsAt: true,
      },
    });
    const departureById = new Map(
      departures.map((departure) => [departure.id, departure]),
    );

    const optionIds = Array.from(
      new Set(departures.map((departure) => departure.tourOptionId)),
    );
    const options = optionIds.length
      ? await this.prisma.tourOption.findMany({
          where: { id: { in: optionIds } },
          select: {
            id: true,
            title: true,
            tourId: true,
          },
        })
      : [];
    const optionById = new Map(options.map((option) => [option.id, option]));

    const tourIds = Array.from(new Set(options.map((option) => option.tourId)));
    const tours = tourIds.length
      ? await this.prisma.tour.findMany({
          where: { id: { in: tourIds } },
          select: {
            id: true,
            title: true,
          },
        })
      : [];
    const tourById = new Map(tours.map((tour) => [tour.id, tour]));

    return items.map((item) => {
      const departure = departureById.get(item.departureSlotId);
      const option = departure
        ? optionById.get(departure.tourOptionId)
        : undefined;
      const tour = option ? tourById.get(option.tourId) : undefined;

      return {
        ...item,
        lineTotal: item.totalPrice,
        optionId: option?.id ?? null,
        optionTitle: option?.title ?? null,
        tourId: option?.tourId ?? null,
        tourTitle: tour?.title ?? null,
        startsAt: departure?.startsAt ?? null,
        currencyCode,
      };
    });
  }

  private async getCurrentPricing(
    departureSlotId: string,
    quantity: number,
    currencyCode: string,
  ) {
    const departure = await this.prisma.departureSlot.findUnique({
      where: { id: departureSlotId },
    });
    if (!departure) {
      throw new NotFoundException('Departure slot not found');
    }

    const now = new Date();

    // 1. Try exact currency match
    let pricingRule = await this.prisma.optionPricingRule.findFirst({
      where: {
        tourOptionId: departure.tourOptionId,
        componentType: 'BASE',
        currencyCode,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gt: now } }],
        minQuantity: { lte: quantity },
      },
      orderBy: [{ validFrom: 'desc' }],
    });

    if (pricingRule) {
      return { unitPrice: pricingRule.amount };
    }

    // 2. Fallback: find any currency and convert
    pricingRule = await this.prisma.optionPricingRule.findFirst({
      where: {
        tourOptionId: departure.tourOptionId,
        componentType: 'BASE',
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gt: now } }],
        minQuantity: { lte: quantity },
      },
      orderBy: [{ validFrom: 'desc' }],
    });

    if (!pricingRule) {
      throw new BadRequestException(
        'No valid pricing rule found for cart item',
      );
    }

    const converted = await this.currencyConverter.convert(
      pricingRule.amount,
      pricingRule.currencyCode,
      currencyCode,
    );

    return {
      unitPrice: new Prisma.Decimal(converted.amount),
    };
  }

  private async getRequiredCart(userId: string) {
    const cart = await this.prisma.bookingCart.findFirst({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart;
  }

  private async getOrCreateCart(userId: string, currencyCode: string) {
    const existing = await this.prisma.bookingCart.findFirst({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (existing) {
      return existing;
    }

    return this.prisma.bookingCart.create({
      data: {
        userId,
        currencyCode,
        expiresAt: this.defaultCartExpiry(),
      },
    });
  }

  private defaultCartExpiry() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private generateBookingRef() {
    return `BK-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;
  }
}
