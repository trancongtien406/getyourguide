import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, PromoScope, PromoType, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListPromotionsDto } from './dto/list-promotions.dto';
import { ListPublicPromotionsDto } from './dto/list-public-promotions.dto';
import { RedeemPromotionDto } from './dto/redeem-promotion.dto';
import { SetPromotionScopesDto } from './dto/set-promotion-scopes.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolvePublicOrderBy(
    query: ListPublicPromotionsDto,
  ): Prisma.PromotionOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'code':
        return [{ code: sortOrder }, { startsAt: 'desc' }];
      case 'name':
        return [{ name: sortOrder }, { startsAt: 'desc' }];
      case 'value':
        return [{ value: sortOrder }, { startsAt: 'desc' }];
      case 'endsat':
        return [{ endsAt: sortOrder }, { startsAt: 'desc' }];
      case 'startsat':
        return [{ startsAt: sortOrder }];
      default:
        return [{ startsAt: 'desc' }];
    }
  }

  private resolveAdminOrderBy(query: ListPromotionsDto): Prisma.PromotionOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'code':
        return [{ code: sortOrder }, { createdAt: 'desc' }];
      case 'name':
        return [{ name: sortOrder }, { createdAt: 'desc' }];
      case 'startsat':
        return [{ startsAt: sortOrder }, { createdAt: 'desc' }];
      case 'endsat':
        return [{ endsAt: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async listPublicPromotions(query: ListPublicPromotionsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const now = new Date();
    const keywordFilter: Prisma.PromotionWhereInput | undefined = query.q
      ? {
          OR: [
            { code: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            { name: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : undefined;

    const where: Prisma.PromotionWhereInput = {
      isActive: true,
      startsAt: { lte: now },
      promoType: query.promoType,
      promoScope: query.promoScope,
      AND: [
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
        ...(keywordFilter ? [keywordFilter] : []),
      ],
    };

    const [total, items] = await Promise.all([
      this.prisma.promotion.count({ where }),
      this.prisma.promotion.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          promoType: true,
          promoScope: true,
          value: true,
          maxDiscountAmount: true,
          minOrderAmount: true,
          startsAt: true,
          endsAt: true,
        },
        orderBy: this.resolvePublicOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async listAdminPromotions(actor: JwtPayload, query: ListPromotionsDto) {
    this.ensureCanManagePromotions(actor);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.PromotionWhereInput = {
      code: query.code ? { contains: query.code, mode: 'insensitive' } : undefined,
      promoType: query.promoType,
      promoScope: query.promoScope,
      ...(query.activeOnly ? { isActive: true } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.promotion.count({ where }),
      this.prisma.promotion.findMany({
        where,
        orderBy: this.resolveAdminOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async getPromotionById(actor: JwtPayload, id: string) {
    this.ensureCanManagePromotions(actor);
    const promotion = await this.ensurePromotionExists(id);
    const scopes = await this.prisma.promotionScopeEntry.findMany({
      where: { promotionId: id },
      orderBy: [{ createdAt: 'asc' }],
    });

    return { ...promotion, scopes };
  }

  async createPromotion(actor: JwtPayload, dto: CreatePromotionDto) {
    this.ensureCanManagePromotions(actor);

    if (dto.promoType === PromoType.PERCENT && dto.value > 100) {
      throw new BadRequestException('Percent promotion cannot exceed 100');
    }

    try {
      return await this.prisma.promotion.create({
        data: {
          code: dto.code.toUpperCase(),
          name: dto.name,
          promoType: dto.promoType,
          promoScope: dto.promoScope,
          value: new Prisma.Decimal(dto.value),
          maxDiscountAmount:
            dto.maxDiscountAmount !== undefined
              ? new Prisma.Decimal(dto.maxDiscountAmount)
              : undefined,
          minOrderAmount:
            dto.minOrderAmount !== undefined
              ? new Prisma.Decimal(dto.minOrderAmount)
              : undefined,
          usageLimitTotal: dto.usageLimitTotal,
          usageLimitPerUser: dto.usageLimitPerUser,
          startsAt: new Date(dto.startsAt),
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
          isActive: dto.isActive,
          metadata: ({
            currencyCode: dto.currencyCode,
          } as unknown) as Prisma.JsonObject,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Promotion code already exists');
      }
      throw error;
    }
  }

  async updatePromotion(actor: JwtPayload, id: string, dto: UpdatePromotionDto) {
    this.ensureCanManagePromotions(actor);
    const existing = await this.ensurePromotionExists(id);

    const nextType = dto.promoType ?? existing.promoType;
    const nextValue = dto.value ?? existing.value.toNumber();
    if (nextType === PromoType.PERCENT && nextValue > 100) {
      throw new BadRequestException('Percent promotion cannot exceed 100');
    }

    return this.prisma.promotion.update({
      where: { id },
      data: {
        name: dto.name,
        promoType: dto.promoType,
        promoScope: dto.promoScope,
        value: dto.value !== undefined ? new Prisma.Decimal(dto.value) : undefined,
        maxDiscountAmount:
          dto.maxDiscountAmount !== undefined
            ? new Prisma.Decimal(dto.maxDiscountAmount)
            : undefined,
        minOrderAmount:
          dto.minOrderAmount !== undefined
            ? new Prisma.Decimal(dto.minOrderAmount)
            : undefined,
        usageLimitTotal: dto.usageLimitTotal,
        usageLimitPerUser: dto.usageLimitPerUser,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt === null ? null : dto.endsAt ? new Date(dto.endsAt) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async setPromotionScopes(actor: JwtPayload, id: string, dto: SetPromotionScopesDto) {
    this.ensureCanManagePromotions(actor);
    const promotion = await this.ensurePromotionExists(id);

    this.validateScopesByPromoScope(promotion.promoScope, dto.entries);

    await this.prisma.$transaction(async (tx) => {
      await tx.promotionScopeEntry.deleteMany({ where: { promotionId: id } });
      if (dto.entries.length) {
        await tx.promotionScopeEntry.createMany({
          data: dto.entries.map((entry) => ({
            promotionId: id,
            supplierId: entry.supplierId,
            tourId: entry.tourId,
            tourOptionId: entry.tourOptionId,
          })),
        });
      }
    });

    return this.getPromotionById(actor, id);
  }

  async redeemPromotion(actor: JwtPayload, dto: RedeemPromotionDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.userId !== actor.sub) {
      throw new ForbiddenException('Cannot apply promotion to this booking');
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Promotion can only be applied to pending payment booking');
    }

    const promotion = await this.prisma.promotion.findFirst({
      where: { code: dto.code.toUpperCase() },
    });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    const scopeEntries = await this.prisma.promotionScopeEntry.findMany({
      where: { promotionId: promotion.id },
    });

    const bookingItems = await this.prisma.bookingItem.findMany({
      where: { bookingId: booking.id },
    });

    this.validatePromotionForBooking(promotion, booking, bookingItems, scopeEntries);

    const [totalUsage, userUsage] = await Promise.all([
      this.prisma.promotionRedemption.count({ where: { promotionId: promotion.id } }),
      this.prisma.promotionRedemption.count({
        where: {
          promotionId: promotion.id,
          userId: actor.sub,
        },
      }),
    ]);

    if (promotion.usageLimitTotal !== null && totalUsage >= promotion.usageLimitTotal) {
      throw new BadRequestException('Promotion usage limit exceeded');
    }

    if (promotion.usageLimitPerUser !== null && userUsage >= promotion.usageLimitPerUser) {
      throw new BadRequestException('Promotion per-user limit exceeded');
    }

    const discountAmount = this.calculateDiscount(
      promotion,
      booking.subtotalAmount,
      booking.currencyCode,
    );

    if (discountAmount.lte(0)) {
      throw new BadRequestException('Promotion discount is not applicable');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingRedemption = await tx.promotionRedemption.findFirst({
        where: {
          promotionId: promotion.id,
          bookingId: booking.id,
        },
      });

      if (existingRedemption) {
        throw new ConflictException('Promotion already applied to this booking');
      }

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          discountAmount,
          totalAmount: booking.subtotalAmount
            .sub(discountAmount)
            .plus(booking.feeAmount)
            .plus(booking.taxAmount),
        },
      });

      const redemption = await tx.promotionRedemption.create({
        data: {
          promotionId: promotion.id,
          bookingId: booking.id,
          userId: actor.sub,
          discountAmount,
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: 'PROMOTION_APPLIED',
          payload: ({
            code: promotion.code,
            discountAmount,
          } as unknown) as Prisma.JsonObject,
          createdBy: actor.sub,
        },
      });

      return {
        booking: updatedBooking,
        redemption,
      };
    });
  }

  private validatePromotionForBooking(
    promotion: {
      startsAt: Date;
      endsAt: Date | null;
      isActive: boolean;
      minOrderAmount: Prisma.Decimal | null;
      promoScope: PromoScope;
    },
    booking: {
      supplierId: string | null;
      subtotalAmount: Prisma.Decimal;
    },
    bookingItems: Array<{ tourId: string; tourOptionId: string }>,
    scopeEntries: Array<{
      supplierId: string | null;
      tourId: string | null;
      tourOptionId: string | null;
    }>,
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

    if (promotion.minOrderAmount && booking.subtotalAmount.lt(promotion.minOrderAmount)) {
      throw new BadRequestException('Booking subtotal does not meet minimum order amount');
    }

    if (promotion.promoScope === PromoScope.GLOBAL) {
      return;
    }

    if (!scopeEntries.length) {
      throw new BadRequestException('Promotion scope is not configured');
    }

    if (promotion.promoScope === PromoScope.SUPPLIER) {
      if (
        !booking.supplierId ||
        !scopeEntries.some((entry) => entry.supplierId === booking.supplierId)
      ) {
        throw new BadRequestException('Promotion does not apply to this supplier');
      }
      return;
    }

    if (promotion.promoScope === PromoScope.TOUR) {
      const tourIds = new Set(scopeEntries.map((entry) => entry.tourId).filter(Boolean));
      if (!bookingItems.some((item) => tourIds.has(item.tourId))) {
        throw new BadRequestException('Promotion does not apply to booking tours');
      }
      return;
    }

    const optionIds = new Set(
      scopeEntries.map((entry) => entry.tourOptionId).filter(Boolean),
    );
    if (!bookingItems.some((item) => optionIds.has(item.tourOptionId))) {
      throw new BadRequestException('Promotion does not apply to booking options');
    }
  }

  private calculateDiscount(
    promotion: {
      promoType: PromoType;
      value: Prisma.Decimal;
      maxDiscountAmount: Prisma.Decimal | null;
      metadata: Prisma.JsonValue;
    },
    subtotal: Prisma.Decimal,
    bookingCurrency: string,
  ) {
    const metadata = (promotion.metadata ?? {}) as { currencyCode?: string };
    if (metadata.currencyCode && metadata.currencyCode !== bookingCurrency) {
      throw new BadRequestException('Promotion is not valid for booking currency');
    }

    let discount = new Prisma.Decimal(0);
    if (promotion.promoType === PromoType.PERCENT) {
      discount = subtotal.mul(promotion.value).div(100);
    } else {
      discount = promotion.value;
    }

    if (promotion.maxDiscountAmount && discount.gt(promotion.maxDiscountAmount)) {
      discount = promotion.maxDiscountAmount;
    }

    if (discount.gt(subtotal)) {
      discount = subtotal;
    }

    return discount;
  }

  private validateScopesByPromoScope(
    scope: PromoScope,
    entries: Array<{ supplierId?: string; tourId?: string; tourOptionId?: string }>,
  ) {
    if (scope === PromoScope.GLOBAL) {
      if (entries.length) {
        throw new BadRequestException('Global promotion cannot have scoped entries');
      }
      return;
    }

    if (!entries.length) {
      throw new BadRequestException('Promotion scope entries are required');
    }

    for (const entry of entries) {
      if (scope === PromoScope.SUPPLIER && !entry.supplierId) {
        throw new BadRequestException('Supplier scope requires supplierId');
      }
      if (scope === PromoScope.TOUR && !entry.tourId) {
        throw new BadRequestException('Tour scope requires tourId');
      }
      if (scope === PromoScope.OPTION && !entry.tourOptionId) {
        throw new BadRequestException('Option scope requires tourOptionId');
      }
    }
  }

  private ensureCanManagePromotions(actor: JwtPayload) {
    const roles = new Set(actor.roles);
    if (roles.has(UserRole.ADMIN) || roles.has(UserRole.OPERATOR)) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private async ensurePromotionExists(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }
    return promotion;
  }
}
