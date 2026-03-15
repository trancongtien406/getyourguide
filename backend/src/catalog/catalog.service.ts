import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    Prisma,
    Tour,
    TourStatus,
    UserRole,
} from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrencyConverterService } from '../common/services/currency-converter.service';
import { PrismaService } from '../prisma/prisma.service';
import { BulkGenerateDeparturesDto } from './dto/bulk-generate-departures.dto';
import { CreateDepartureSlotDto } from './dto/create-departure-slot.dto';
import { CreateItineraryStopDto } from './dto/create-itinerary-stop.dto';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { CreateTourMediaDto } from './dto/create-tour-media.dto';
import { CreateTourOptionDto } from './dto/create-tour-option.dto';
import { CreateTourDto } from './dto/create-tour.dto';
import { ListToursDto } from './dto/list-tours.dto';
import { SearchToursDto } from './dto/search-tours.dto';
import { SetTourCategoriesDto } from './dto/set-tour-categories.dto';
import { SetTourStatusDto } from './dto/set-tour-status.dto';
import { SetTourTagsDto } from './dto/set-tour-tags.dto';
import { UpdateDepartureSlotDto } from './dto/update-departure-slot.dto';
import { UpdateItineraryStopDto } from './dto/update-itinerary-stop.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { UpdateTourMediaDto } from './dto/update-tour-media.dto';
import { UpdateTourOptionDto } from './dto/update-tour-option.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { UpsertItineraryStopTranslationDto } from './dto/upsert-itinerary-stop-translation.dto';
import { UpsertTourOptionTranslationDto } from './dto/upsert-tour-option-translation.dto';
import { UpsertTourTranslationDto } from './dto/upsert-tour-translation.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverterService,
  ) {}

  private resolveListToursOrderBy(query: ListToursDto): Prisma.TourOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'title':
        return [{ title: sortOrder }, { createdAt: 'desc' }];
      case 'publishedat':
        return [{ publishedAt: sortOrder }, { createdAt: 'desc' }];
      case 'rating':
        return [{ ratingAvg: sortOrder }, { ratingCount: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async listTours(query: ListToursDto, lang?: string | null, targetCurrency?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.TourWhereInput = {
      cityId: query.cityId,
      supplierId: query.supplierId,
      status: query.status ?? TourStatus.PUBLISHED,
      ...(query.isFeatured !== undefined && { isFeatured: query.isFeatured }),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
              { shortDescription: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, tours] = await Promise.all([
      this.prisma.tour.count({ where }),
      this.prisma.tour.findMany({
        where,
        orderBy: this.resolveListToursOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Batch-enrich with media, categories, and options+pricing for card rendering
    const tourIds = tours.map((t) => t.id);

    if (tourIds.length === 0) {
      return { page, pageSize, total, items: [] };
    }

    const [allMedia, allCategories, allOptions] = await Promise.all([
      this.prisma.tourMedia.findMany({
        where: { tourId: { in: tourIds } },
        orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.tourCategory.findMany({
        where: { tourId: { in: tourIds } },
      }),
      this.prisma.tourOption.findMany({
        where: { tourId: { in: tourIds } },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    const optionIds = allOptions.map((o) => o.id);
    const allPricingRules = optionIds.length
      ? await this.prisma.optionPricingRule.findMany({
          where: { tourOptionId: { in: optionIds } },
          orderBy: [{ validFrom: 'desc' }],
        })
      : [];

    // Convert pricing to target currency
    if (targetCurrency) {
      await this.currencyConverter.convertPricingRules(allPricingRules, targetCurrency);
    }

    // Load translations if language specified
    let transMap: Map<string, { title: string; shortDescription?: string | null }> | null = null;
    if (lang) {
      const translations = await this.prisma.tourTranslation.findMany({
        where: { tourId: { in: tourIds }, languageCode: lang },
      });
      transMap = new Map(translations.map((t) => [t.tourId, t]));
    }

    const items = tours.map((tour) => {
      const tr = transMap?.get(tour.id);
      return {
        ...tour,
        ...(tr && { title: tr.title, shortDescription: tr.shortDescription ?? tour.shortDescription }),
        media: allMedia.filter((m) => m.tourId === tour.id),
        categories: allCategories.filter((c) => c.tourId === tour.id),
        options: allOptions
          .filter((o) => o.tourId === tour.id)
          .map((option) => ({
            ...option,
            pricingRules: allPricingRules.filter((pr) => pr.tourOptionId === option.id),
          })),
      };
    });

    return { page, pageSize, total, items };
  }

  async searchTours(query: SearchToursDto, lang?: string | null, targetCurrency?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions: Prisma.Sql[] = [
      Prisma.sql`t.status = ${query.status ?? TourStatus.PUBLISHED}`,
    ];

    if (query.cityId) {
      conditions.push(Prisma.sql`t."cityId" = ${query.cityId}::uuid`);
    }
    if (query.supplierId) {
      conditions.push(Prisma.sql`t."supplierId" = ${query.supplierId}::uuid`);
    }
    if (query.q) {
      conditions.push(
        Prisma.sql`(t.title ILIKE ${`%${query.q}%`} OR t."shortDescription" ILIKE ${`%${query.q}%`})`,
      );
    }
    if (query.minRating !== undefined) {
      conditions.push(Prisma.sql`COALESCE(t."ratingAvg", 0) >= ${query.minRating}`);
    }
    if (query.maxDurationMinutes !== undefined) {
      conditions.push(
        Prisma.sql`(t."durationMinutes" IS NULL OR t."durationMinutes" <= ${query.maxDurationMinutes})`,
      );
    }
    if (query.categoryId) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM tour_categories tc WHERE tc."tourId" = t.id AND tc."categoryId" = ${query.categoryId}::uuid)`,
      );
    }
    if (query.tagId) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM tour_tag_map tm WHERE tm."tourId" = t.id AND tm."tagId" = ${query.tagId}::uuid)`,
      );
    }

    if (query.dateFrom || query.dateTo) {
      const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
      const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM tour_options o
          JOIN departure_slots ds ON ds."tourOptionId" = o.id
          WHERE o."tourId" = t.id
            ${dateFrom ? Prisma.sql`AND ds."startsAt" >= ${dateFrom}` : Prisma.empty}
            ${dateTo ? Prisma.sql`AND ds."startsAt" <= ${dateTo}` : Prisma.empty}
            AND ds.status = 'ACTIVE'
        )`,
      );
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM tour_options o
          JOIN option_pricing_rules pr ON pr."tourOptionId" = o.id
          WHERE o."tourId" = t.id
            AND pr."componentType" = 'BASE'
            ${query.minPrice !== undefined ? Prisma.sql`AND pr.amount >= ${query.minPrice}` : Prisma.empty}
            ${query.maxPrice !== undefined ? Prisma.sql`AND pr.amount <= ${query.maxPrice}` : Prisma.empty}
        )`,
      );
    }

    let orderBy: Prisma.Sql = Prisma.sql`t."createdAt" DESC`;
    if (query.sortBy === 'price_asc') {
      orderBy = Prisma.sql`min_price ASC NULLS LAST`;
    } else if (query.sortBy === 'price_desc') {
      orderBy = Prisma.sql`min_price DESC NULLS LAST`;
    } else if (query.sortBy === 'rating_desc') {
      orderBy = Prisma.sql`t."ratingAvg" DESC NULLS LAST, t."ratingCount" DESC`;
    }

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    // Use base table only for search (column names are camelCase in DB)
    const titleCol = Prisma.sql`t.title`;
    const shortDescCol = Prisma.sql`t."shortDescription"`;

    // Count without JOIN
    const countResult = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM tours t
      ${whereClause}
    `);
    const total = Number(countResult[0].count);

    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        t.id,
        t.slug,
        ${titleCol},
        ${shortDescCol},
        t.status,
        t."cityId",
        t."supplierId",
        t."ratingAvg",
        t."ratingCount",
        t."durationMinutes",
        t."publishedAt",
        (
          SELECT MIN(pr.amount)
          FROM tour_options o
          JOIN option_pricing_rules pr ON pr."tourOptionId" = o.id
          WHERE o."tourId" = t.id AND pr."componentType" = 'BASE'
        ) AS min_price,
        (
          SELECT m.url
          FROM tour_media m
          WHERE m."tourId" = t.id
          ORDER BY m."isCover" DESC, m."sortOrder" ASC
          LIMIT 1
        ) AS "coverImageUrl"
      FROM tours t
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    // Convert min_price to target currency if requested
    if (targetCurrency && rows.length > 0) {
      for (const row of rows) {
        if (row.min_price != null) {
          const converted = await this.currencyConverter.convert(
            Number(row.min_price),
            'USD',
            targetCurrency,
          );
          row.min_price = converted.amount;
        }
      }
    }

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items: rows,
    };
  }

  async getTourBySlug(slug: string, lang?: string | null, targetCurrency?: string | null) {
    const tour = await this.prisma.tour.findUnique({ where: { slug } });
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    return this.enrichTour(tour, lang, targetCurrency);
  }

  async getTourById(id: string, lang?: string | null, targetCurrency?: string | null) {
    const tour = await this.prisma.tour.findUnique({ where: { id } });
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    return this.enrichTour(tour, lang, targetCurrency);
  }

  private async enrichTour(tour: Tour, lang?: string | null, targetCurrency?: string | null) {
    const id = tour.id;

    const [categories, tags, media, options, itinerary] = await Promise.all([
      this.prisma.tourCategory.findMany({ where: { tourId: id } }),
      this.prisma.tourTagMap.findMany({ where: { tourId: id } }),
      this.prisma.tourMedia.findMany({
        where: { tourId: id },
        orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.tourOption.findMany({
        where: { tourId: id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.tourItineraryStop.findMany({
        where: { tourId: id },
        orderBy: [{ stopOrder: 'asc' }],
      }),
    ]);

    const optionIds = options.map((option) => option.id);
    const [departures, pricingRules] = await Promise.all([
      this.prisma.departureSlot.findMany({
        where: { tourOptionId: { in: optionIds.length ? optionIds : [''] } },
        orderBy: [{ startsAt: 'asc' }],
      }),
      this.prisma.optionPricingRule.findMany({
        where: { tourOptionId: { in: optionIds.length ? optionIds : [''] } },
        orderBy: [{ validFrom: 'desc' }],
      }),
    ]);

    const departureIds = departures.map((d) => d.id);
    const inventoryByDepartureId = await this.prisma.inventorySlot.findMany({
      where: { departureSlotId: { in: departureIds.length ? departureIds : [''] } },
    });

    // Overlay translations if language specified
    let tourOverlay: Partial<Tour> = {};
    let itineraryTransMap: Map<string, { title?: string | null; description?: string | null }> | null = null;
    let optionTransMap: Map<string, { title?: string | null; description?: string | null }> | null = null;

    if (lang) {
      const itineraryStopIds = itinerary.map((s) => s.id);
      const optionIdsList = options.map((o) => o.id);

      const [tourTrans, itineraryTrans, optionTrans] = await Promise.all([
        this.prisma.tourTranslation.findFirst({
          where: { tourId: id, languageCode: lang },
        }),
        itineraryStopIds.length
          ? this.prisma.tourItineraryStopTranslation.findMany({
              where: { stopId: { in: itineraryStopIds }, languageCode: lang },
            })
          : Promise.resolve([]),
        optionIdsList.length
          ? this.prisma.tourOptionTranslation.findMany({
              where: { tourOptionId: { in: optionIdsList }, languageCode: lang },
            })
          : Promise.resolve([]),
      ]);

      if (tourTrans) {
        tourOverlay = {
          ...(tourTrans.title && { title: tourTrans.title }),
          ...(tourTrans.shortDescription && { shortDescription: tourTrans.shortDescription }),
          ...(tourTrans.fullDescription && { fullDescription: tourTrans.fullDescription }),
        } as Partial<Tour>;
      }

      itineraryTransMap = new Map(
        itineraryTrans.map((t) => [t.stopId, { title: t.title, description: t.description }] as const),
      );
      optionTransMap = new Map(
        optionTrans.map((t) => [t.tourOptionId, { title: t.title, description: t.description }] as const),
      );
    }

    const result = {
      ...tour,
      ...tourOverlay,
      categories,
      tags,
      media,
      itinerary: itinerary.map((stop) => {
        const tr = itineraryTransMap?.get(stop.id);
        return {
          ...stop,
          ...(tr?.title && { title: tr.title }),
          ...(tr?.description && { description: tr.description }),
        };
      }),
      options: options.map((option) => {
        const tr = optionTransMap?.get(option.id);
        const resolvedTitle = tr?.title || option.title;
        return {
          ...option,
          ...(tr?.title && { title: tr.title }),
          ...(tr?.description && { description: tr.description }),
          name: resolvedTitle,
          departures: departures
            .filter((departure) => departure.tourOptionId === option.id)
            .map((departure) => ({
              ...departure,
              inventory:
                inventoryByDepartureId.find(
                  (inventory) => inventory.departureSlotId === departure.id,
                ) ?? null,
            })),
          pricingRules: pricingRules.filter(
            (pricingRule) => pricingRule.tourOptionId === option.id,
          ),
        };
      }),
    };

    // Convert all pricing rules to target currency
    if (targetCurrency) {
      const allPricingRulesInResult = result.options.flatMap((o) => o.pricingRules);
      await this.currencyConverter.convertPricingRules(allPricingRulesInResult, targetCurrency);
    }

    return result;
  }

  async createTour(actor: JwtPayload, dto: CreateTourDto) {
    await this.ensureCanManageSupplier(actor, dto.supplierId);

    try {
      return await this.prisma.tour.create({
        data: {
          supplierId: dto.supplierId,
          cityId: dto.cityId,
          slug: dto.slug,
          title: dto.title,
          shortDescription: dto.shortDescription,
          fullDescription: dto.fullDescription,
          meetingPoint: dto.meetingPoint,
          durationMinutes: dto.durationMinutes,
          maxGroupSize: dto.maxGroupSize,
          inventoryMode: dto.inventoryMode,
          status: dto.status,
          whatToBring: dto.whatToBring,
          importantInfo: dto.importantInfo,
          availableLanguages: dto.availableLanguages,
          isFeatured: dto.isFeatured,
          badgeText: dto.badgeText,
          allowPayLater: dto.allowPayLater,
          defaultLanguageCode: dto.defaultLanguageCode,
          cancellationPolicy: dto.cancellationPolicy,
          publishedAt:
            dto.status === TourStatus.PUBLISHED ? new Date() : undefined,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Tour slug already exists');
    }
  }

  async updateTour(actor: JwtPayload, tourId: string, dto: UpdateTourDto) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    try {
      return await this.prisma.tour.update({
        where: { id: tourId },
        data: {
          cityId: dto.cityId,
          slug: dto.slug,
          title: dto.title,
          shortDescription: dto.shortDescription,
          fullDescription: dto.fullDescription,
          meetingPoint: dto.meetingPoint,
          durationMinutes: dto.durationMinutes,
          maxGroupSize: dto.maxGroupSize,
          inventoryMode: dto.inventoryMode,
          status: dto.status,
          whatToBring: dto.whatToBring,
          importantInfo: dto.importantInfo,
          availableLanguages: dto.availableLanguages,
          isFeatured: dto.isFeatured,
          badgeText: dto.badgeText,
          allowPayLater: dto.allowPayLater,
          defaultLanguageCode: dto.defaultLanguageCode,
          cancellationPolicy: dto.cancellationPolicy,
          publishedAt:
            dto.status === TourStatus.PUBLISHED ? new Date() : undefined,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Tour slug already exists');
    }
  }

  async createTourOption(
    actor: JwtPayload,
    tourId: string,
    dto: CreateTourOptionDto,
  ) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    try {
      return await this.prisma.tourOption.create({
        data: {
          tourId,
          code: dto.code,
          title: dto.title,
          description: dto.description,
          isDefault: dto.isDefault,
          minParticipants: dto.minParticipants,
          maxParticipants: dto.maxParticipants,
          durationMinutes: dto.durationMinutes,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Tour option code already exists');
    }
  }

  async updateTourOption(
    actor: JwtPayload,
    optionId: string,
    dto: UpdateTourOptionDto,
  ) {
    const option = await this.prisma.tourOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    try {
      return await this.prisma.tourOption.update({
        where: { id: optionId },
        data: {
          code: dto.code,
          title: dto.title,
          description: dto.description,
          isDefault: dto.isDefault,
          minParticipants: dto.minParticipants,
          maxParticipants: dto.maxParticipants,
          durationMinutes: dto.durationMinutes,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Tour option code already exists');
    }
  }

  async bulkGenerateDepartures(
    actor: JwtPayload,
    optionId: string,
    dto: BulkGenerateDeparturesDto,
  ) {
    const option = await this.prisma.tourOption.findUnique({ where: { id: optionId } });
    if (!option) throw new NotFoundException('Tour option not found');

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    const durationMins = dto.durationMinutes ?? option.durationMinutes ?? tour.durationMinutes ?? 120;

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    let created = 0;
    let skipped = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      for (const time of dto.times) {
        const [h, m] = time.split(':').map(Number);
        const startsAt = new Date(d);
        startsAt.setHours(h, m, 0, 0);

        const endsAt = new Date(startsAt.getTime() + durationMins * 60_000);

        const exists = await this.prisma.departureSlot.findFirst({
          where: { tourOptionId: optionId, startsAt },
        });
        if (exists) { skipped++; continue; }

        const slot = await this.prisma.departureSlot.create({
          data: { tourOptionId: optionId, startsAt, endsAt, status: 'ACTIVE' },
        });
        await this.prisma.inventorySlot.create({
          data: { departureSlotId: slot.id, totalCapacity: dto.totalCapacity, heldCapacity: 0, bookedCapacity: 0 },
        });
        created++;
      }
    }

    return { created, skipped };
  }

  async listDepartureSlots(optionId: string) {
    const departures = await this.prisma.departureSlot.findMany({
      where: { tourOptionId: optionId },
      orderBy: [{ startsAt: 'asc' }],
    });

    const departureIds = departures.map((d) => d.id);
    const inventories = departureIds.length
      ? await this.prisma.inventorySlot.findMany({
          where: { departureSlotId: { in: departureIds } },
        })
      : [];

    return departures.map((d) => ({
      ...d,
      inventory: inventories.find((inv) => inv.departureSlotId === d.id) ?? null,
    }));
  }

  async deleteDepartureSlot(actor: JwtPayload, departureId: string) {
    const departure = await this.prisma.departureSlot.findUnique({
      where: { id: departureId },
    });
    if (!departure) {
      throw new NotFoundException('Departure slot not found');
    }

    const option = await this.prisma.tourOption.findUnique({
      where: { id: departure.tourOptionId },
    });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    await this.prisma.$transaction(async (tx) => {
      await tx.inventorySlot.deleteMany({ where: { departureSlotId: departureId } });
      await tx.departureSlot.delete({ where: { id: departureId } });
    });

    return { deleted: true };
  }

  async createDepartureSlot(
    actor: JwtPayload,
    optionId: string,
    dto: CreateDepartureSlotDto,
  ) {
    const option = await this.prisma.tourOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    return this.prisma.$transaction(async (tx) => {
      const departure = await tx.departureSlot.create({
        data: {
          tourOptionId: optionId,
          startsAt: new Date(dto.startsAt),
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
          timezone: dto.timezone,
          status: dto.status,
        },
      });

      const inventory = await tx.inventorySlot.create({
        data: {
          departureSlotId: departure.id,
          totalCapacity: dto.totalCapacity,
          oversellLimit: dto.oversellLimit,
        },
      });

      return {
        ...departure,
        inventory,
      };
    });
  }

  async updateDepartureSlot(
    actor: JwtPayload,
    departureId: string,
    dto: UpdateDepartureSlotDto,
  ) {
    const departure = await this.prisma.departureSlot.findUnique({
      where: { id: departureId },
    });
    if (!departure) {
      throw new NotFoundException('Departure slot not found');
    }

    const option = await this.prisma.tourOption.findUnique({
      where: { id: departure.tourOptionId },
    });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    return this.prisma.$transaction(async (tx) => {
      const updatedDeparture = await tx.departureSlot.update({
        where: { id: departureId },
        data: {
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
          timezone: dto.timezone,
          status: dto.status,
        },
      });

      let inventory = await tx.inventorySlot.findUnique({
        where: { departureSlotId: departureId },
      });

      if (!inventory && (dto.totalCapacity !== undefined || dto.oversellLimit !== undefined)) {
        inventory = await tx.inventorySlot.create({
          data: {
            departureSlotId: departureId,
            totalCapacity: dto.totalCapacity ?? 0,
            oversellLimit: dto.oversellLimit,
          },
        });
      } else if (inventory && (dto.totalCapacity !== undefined || dto.oversellLimit !== undefined)) {
        inventory = await tx.inventorySlot.update({
          where: { departureSlotId: departureId },
          data: {
            totalCapacity: dto.totalCapacity,
            oversellLimit: dto.oversellLimit,
          },
        });
      }

      return {
        ...updatedDeparture,
        inventory,
      };
    });
  }

  async setTourCategories(
    actor: JwtPayload,
    tourId: string,
    dto: SetTourCategoriesDto,
  ) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    const categoryIds = [...new Set(dto.categoryIds)];
    const count = await this.prisma.category.count({
      where: { id: { in: categoryIds } },
    });
    if (count !== categoryIds.length) {
      throw new BadRequestException('One or more category IDs are invalid');
    }

    await this.prisma.$transaction([
      this.prisma.tourCategory.deleteMany({ where: { tourId } }),
      this.prisma.tourCategory.createMany({
        data: categoryIds.map((categoryId) => ({ tourId, categoryId })),
      }),
    ]);

    return this.prisma.tourCategory.findMany({ where: { tourId } });
  }

  async setTourTags(actor: JwtPayload, tourId: string, dto: SetTourTagsDto) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    const tagIds = [...new Set(dto.tagIds)];
    const count = await this.prisma.tourTag.count({
      where: { id: { in: tagIds } },
    });
    if (count !== tagIds.length) {
      throw new BadRequestException('One or more tag IDs are invalid');
    }

    await this.prisma.$transaction([
      this.prisma.tourTagMap.deleteMany({ where: { tourId } }),
      this.prisma.tourTagMap.createMany({
        data: tagIds.map((tagId) => ({ tourId, tagId })),
      }),
    ]);

    return this.prisma.tourTagMap.findMany({ where: { tourId } });
  }

  async addTourMedia(actor: JwtPayload, tourId: string, dto: CreateTourMediaDto) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    if (dto.isCover) {
      await this.prisma.tourMedia.updateMany({
        where: { tourId },
        data: { isCover: false },
      });
    }

    return this.prisma.tourMedia.create({
      data: {
        tourId,
        mediaType: dto.mediaType,
        url: dto.url,
        altText: dto.altText,
        sortOrder: dto.sortOrder,
        isCover: dto.isCover,
      },
    });
  }

  async updateTourMedia(
    actor: JwtPayload,
    mediaId: string,
    dto: UpdateTourMediaDto,
  ) {
    const media = await this.prisma.tourMedia.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException('Tour media not found');
    }

    const tour = await this.getTourById(media.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    if (dto.isCover) {
      await this.prisma.tourMedia.updateMany({
        where: { tourId: media.tourId },
        data: { isCover: false },
      });
    }

    return this.prisma.tourMedia.update({
      where: { id: mediaId },
      data: {
        mediaType: dto.mediaType,
        url: dto.url,
        altText: dto.altText,
        sortOrder: dto.sortOrder,
        isCover: dto.isCover,
      },
    });
  }

  async deleteTourMedia(actor: JwtPayload, mediaId: string) {
    const media = await this.prisma.tourMedia.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException('Tour media not found');
    }

    const tour = await this.getTourById(media.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    const objectKey = this.tryExtractObjectKey(media.url);

    await this.prisma.$transaction(async (tx) => {
      await tx.tourMedia.delete({ where: { id: mediaId } });

      if (objectKey) {
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'tour_media',
            aggregateId: mediaId,
            eventType: 'OBJECT_DELETE_REQUESTED',
            payload: {
              objectKey,
              url: media.url,
            },
          },
        });
      }
    });

    return { message: 'Tour media deleted', objectKey };
  }

  async setTourStatus(actor: JwtPayload, tourId: string, dto: SetTourStatusDto) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    if (dto.status === TourStatus.PUBLISHED) {
      await this.validateReadyToPublish(tourId);
    }

    return this.prisma.tour.update({
      where: { id: tourId },
      data: {
        status: dto.status,
        publishedAt: dto.status === TourStatus.PUBLISHED ? new Date() : null,
      },
    });
  }

  async getTourTranslations(tourId: string) {
    await this.getTourById(tourId);
    return this.prisma.tourTranslation.findMany({
      where: { tourId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertTourTranslation(
    actor: JwtPayload,
    tourId: string,
    dto: UpsertTourTranslationDto,
  ) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    return this.prisma.tourTranslation.upsert({
      where: {
        tourId_languageCode: {
          tourId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        title: dto.title,
        shortDescription: dto.shortDescription,
        fullDescription: dto.fullDescription,
        includedItems: dto.includedItems,
        excludedItems: dto.excludedItems,
        highlights: dto.highlights,
        whatToBring: dto.whatToBring,
        importantInfo: dto.importantInfo,
      },
      create: {
        tourId,
        languageCode: dto.languageCode,
        title: dto.title,
        shortDescription: dto.shortDescription,
        fullDescription: dto.fullDescription,
        includedItems: dto.includedItems,
        excludedItems: dto.excludedItems,
        highlights: dto.highlights,
        whatToBring: dto.whatToBring,
        importantInfo: dto.importantInfo,
      },
    });
  }

  async deleteTourTranslation(
    actor: JwtPayload,
    tourId: string,
    languageCode: string,
  ) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    try {
      return await this.prisma.tourTranslation.delete({
        where: {
          tourId_languageCode: {
            tourId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Tour Option Translations
  // ─────────────────────────────────────────────────────────────────────

  async getTourOptionTranslations(optionId: string) {
    const option = await this.prisma.tourOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }
    return this.prisma.tourOptionTranslation.findMany({
      where: { tourOptionId: optionId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertTourOptionTranslation(
    actor: JwtPayload,
    optionId: string,
    dto: UpsertTourOptionTranslationDto,
  ) {
    const option = await this.prisma.tourOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    return this.prisma.tourOptionTranslation.upsert({
      where: {
        tourOptionId_languageCode: {
          tourOptionId: optionId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        title: dto.title,
        description: dto.description,
      },
      create: {
        tourOptionId: optionId,
        languageCode: dto.languageCode,
        title: dto.title,
        description: dto.description,
      },
    });
  }

  async deleteTourOptionTranslation(
    actor: JwtPayload,
    optionId: string,
    languageCode: string,
  ) {
    const option = await this.prisma.tourOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    try {
      return await this.prisma.tourOptionTranslation.delete({
        where: {
          tourOptionId_languageCode: {
            tourOptionId: optionId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  private async validateReadyToPublish(tourId: string) {
    const options = await this.prisma.tourOption.findMany({
      where: { tourId, isActive: true },
    });
    if (options.length === 0) {
      throw new BadRequestException('Cannot publish tour without active option');
    }

    const optionIds = options.map((o) => o.id);
    const [departureCount, pricingCount, mediaCount] = await Promise.all([
      this.prisma.departureSlot.count({
        where: { tourOptionId: { in: optionIds }, status: 'ACTIVE' },
      }),
      this.prisma.optionPricingRule.count({
        where: {
          tourOptionId: { in: optionIds },
          componentType: 'BASE',
        },
      }),
      this.prisma.tourMedia.count({ where: { tourId } }),
    ]);

    if (departureCount === 0) {
      throw new BadRequestException('Cannot publish tour without departure slots');
    }
    if (pricingCount === 0) {
      throw new BadRequestException('Cannot publish tour without base pricing rules');
    }
    if (mediaCount === 0) {
      throw new BadRequestException('Cannot publish tour without media');
    }
  }

  async createPricingRule(
    actor: JwtPayload,
    optionId: string,
    dto: CreatePricingRuleDto,
  ) {
    const option = await this.prisma.tourOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    return this.prisma.optionPricingRule.create({
      data: {
        tourOptionId: optionId,
        componentType: dto.componentType,
        travelerType: dto.travelerType ?? 'adult',
        currencyCode: dto.currencyCode.toUpperCase(),
        amount: new Prisma.Decimal(dto.amount),
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        daysOfWeek: dto.daysOfWeek,
        minQuantity: dto.minQuantity,
      },
    });
  }

  async updatePricingRule(
    actor: JwtPayload,
    pricingRuleId: string,
    dto: UpdatePricingRuleDto,
  ) {
    const pricingRule = await this.prisma.optionPricingRule.findUnique({
      where: { id: pricingRuleId },
    });
    if (!pricingRule) {
      throw new NotFoundException('Pricing rule not found');
    }

    const option = await this.prisma.tourOption.findUnique({
      where: { id: pricingRule.tourOptionId },
    });
    if (!option) {
      throw new NotFoundException('Tour option not found');
    }

    const tour = await this.getTourById(option.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    return this.prisma.optionPricingRule.update({
      where: { id: pricingRuleId },
      data: {
        componentType: dto.componentType,
        travelerType: dto.travelerType,
        currencyCode: dto.currencyCode?.toUpperCase(),
        amount: dto.amount ? new Prisma.Decimal(dto.amount) : undefined,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        daysOfWeek: dto.daysOfWeek,
        minQuantity: dto.minQuantity,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Tour Itinerary Stops
  // ─────────────────────────────────────────────────────────────────────

  async getTourItinerary(tourId: string) {
    await this.getTourById(tourId);
    return this.prisma.tourItineraryStop.findMany({
      where: { tourId },
      orderBy: [{ stopOrder: 'asc' }],
    });
  }

  async createItineraryStop(
    actor: JwtPayload,
    tourId: string,
    dto: CreateItineraryStopDto,
  ) {
    const tour = await this.getTourById(tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    try {
      return await this.prisma.tourItineraryStop.create({
        data: {
          tourId,
          stopOrder: dto.stopOrder,
          title: dto.title,
          description: dto.description,
          durationMinutes: dto.durationMinutes,
          transportMode: dto.transportMode,
          transportDurationMinutes: dto.transportDurationMinutes,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Itinerary stop order already exists for this tour');
    }
  }

  async updateItineraryStop(
    actor: JwtPayload,
    stopId: string,
    dto: UpdateItineraryStopDto,
  ) {
    const stop = await this.prisma.tourItineraryStop.findUnique({ where: { id: stopId } });
    if (!stop) {
      throw new NotFoundException('Itinerary stop not found');
    }

    const tour = await this.getTourById(stop.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    try {
      return await this.prisma.tourItineraryStop.update({
        where: { id: stopId },
        data: {
          stopOrder: dto.stopOrder,
          title: dto.title,
          description: dto.description,
          durationMinutes: dto.durationMinutes,
          transportMode: dto.transportMode,
          transportDurationMinutes: dto.transportDurationMinutes,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Itinerary stop order already exists for this tour');
    }
  }

  async deleteItineraryStop(actor: JwtPayload, stopId: string) {
    const stop = await this.prisma.tourItineraryStop.findUnique({ where: { id: stopId } });
    if (!stop) {
      throw new NotFoundException('Itinerary stop not found');
    }

    const tour = await this.getTourById(stop.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    await this.prisma.$transaction([
      this.prisma.tourItineraryStopTranslation.deleteMany({ where: { stopId } }),
      this.prisma.tourItineraryStop.delete({ where: { id: stopId } }),
    ]);

    return { message: 'Itinerary stop deleted' };
  }

  async getItineraryStopTranslations(stopId: string) {
    const stop = await this.prisma.tourItineraryStop.findUnique({ where: { id: stopId } });
    if (!stop) {
      throw new NotFoundException('Itinerary stop not found');
    }
    return this.prisma.tourItineraryStopTranslation.findMany({
      where: { stopId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertItineraryStopTranslation(
    actor: JwtPayload,
    stopId: string,
    dto: UpsertItineraryStopTranslationDto,
  ) {
    const stop = await this.prisma.tourItineraryStop.findUnique({ where: { id: stopId } });
    if (!stop) {
      throw new NotFoundException('Itinerary stop not found');
    }

    const tour = await this.getTourById(stop.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    return this.prisma.tourItineraryStopTranslation.upsert({
      where: {
        stopId_languageCode: {
          stopId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        title: dto.title,
        description: dto.description,
      },
      create: {
        stopId,
        languageCode: dto.languageCode,
        title: dto.title,
        description: dto.description,
      },
    });
  }

  async deleteItineraryStopTranslation(
    actor: JwtPayload,
    stopId: string,
    languageCode: string,
  ) {
    const stop = await this.prisma.tourItineraryStop.findUnique({ where: { id: stopId } });
    if (!stop) {
      throw new NotFoundException('Itinerary stop not found');
    }

    const tour = await this.getTourById(stop.tourId);
    await this.ensureCanManageSupplier(actor, tour.supplierId);

    try {
      return await this.prisma.tourItineraryStopTranslation.delete({
        where: {
          stopId_languageCode: {
            stopId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  private async ensureCanManageSupplier(actor: JwtPayload, supplierId: string) {
    const actorRoles = new Set(actor.roles);
    if (actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR)) {
      return;
    }

    if (
      !actorRoles.has(UserRole.SUPPLIER_ADMIN) &&
      !actorRoles.has(UserRole.SUPPLIER_STAFF)
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const membership = await this.prisma.supplierUser.findFirst({
      where: {
        supplierId,
        userId: actor.sub,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You cannot manage this supplier catalog');
    }
  }

  private handleKnownPrismaError(error: unknown, conflictMessage: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(conflictMessage);
    }

    throw error;
  }

  private tryExtractObjectKey(url: string): string | null {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/^\//, '');
      if (!path) {
        return null;
      }

      const bucket = process.env.OBJECT_STORAGE_BUCKET;
      if (bucket && path.startsWith(`${bucket}/`)) {
        return path.slice(bucket.length + 1);
      }

      return path;
    } catch {
      return null;
    }
  }
}
