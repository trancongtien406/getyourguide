import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { CreateCountryDto } from './dto/create-country.dto';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { CreateFaqCategoryDto } from './dto/create-faq-category.dto';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';
import { CreateLanguageDto } from './dto/create-language.dto';
import { ListCitiesDto } from './dto/list-cities.dto';
import { ListCountriesDto } from './dto/list-countries.dto';
import { ListCurrenciesDto } from './dto/list-currencies.dto';
import { ListExchangeRatesDto } from './dto/list-exchange-rates.dto';
import { ListLanguagesDto } from './dto/list-languages.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { UpdateFaqCategoryDto } from './dto/update-faq-category.dto';
import { UpdateFaqItemDto } from './dto/update-faq-item.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { UpsertCityTranslationDto } from './dto/upsert-city-translation.dto';
import { UpsertCountryTranslationDto } from './dto/upsert-country-translation.dto';
import { UpsertSupportFaqCategoryTranslationDto } from './dto/upsert-support-faq-category-translation.dto';
import { UpsertSupportFaqItemTranslationDto } from './dto/upsert-support-faq-item-translation.dto';

@Injectable()
export class ReferenceDataService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveCountryOrderBy(query: ListCountriesDto): Prisma.CountryOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'asc';
    switch (query.sortBy) {
      case 'iso2':
        return [{ iso2: sortOrder }, { name: 'asc' }];
      case 'iso3':
        return [{ iso3: sortOrder }, { name: 'asc' }];
      case 'createdat':
        return [{ createdAt: query.sortOrder ?? 'desc' }];
      case 'name':
        return [{ name: sortOrder }];
      default:
        return [{ name: 'asc' }];
    }
  }

  private resolveCityOrderBy(query: ListCitiesDto): Prisma.CityOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'asc';
    switch (query.sortBy) {
      case 'normalizedname':
        return [{ normalizedName: sortOrder }, { name: 'asc' }];
      case 'createdat':
        return [{ createdAt: query.sortOrder ?? 'desc' }];
      case 'name':
        return [{ name: sortOrder }];
      default:
        return [{ name: 'asc' }];
    }
  }

  private resolveLanguageOrderBy(query: ListLanguagesDto): Prisma.LanguageOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'asc';
    switch (query.sortBy) {
      case 'name':
        return [{ name: sortOrder }, { code: 'asc' }];
      case 'code':
        return [{ code: sortOrder }];
      default:
        return [{ code: 'asc' }];
    }
  }

  private resolveCurrencyOrderBy(query: ListCurrenciesDto): Prisma.CurrencyOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'asc';
    switch (query.sortBy) {
      case 'name':
        return [{ name: sortOrder }, { code: 'asc' }];
      case 'code':
        return [{ code: sortOrder }];
      default:
        return [{ code: 'asc' }];
    }
  }

  private resolveExchangeRateOrderBy(
    query: ListExchangeRatesDto,
  ): Prisma.ExchangeRateOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'basecurrency':
        return [{ baseCurrency: sortOrder }, { effectiveAt: 'desc' }];
      case 'quotecurrency':
        return [{ quoteCurrency: sortOrder }, { effectiveAt: 'desc' }];
      case 'rate':
        return [{ rate: sortOrder }, { effectiveAt: 'desc' }];
      case 'effectiveat':
        return [{ effectiveAt: sortOrder }];
      default:
        return [{ effectiveAt: 'desc' }];
    }
  }

  async listCountries(query: ListCountriesDto, lang?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CountryWhereInput = {
      currencyCode: query.currencyCode?.toUpperCase(),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { iso2: { contains: query.q.toUpperCase(), mode: 'insensitive' } },
              { iso3: { contains: query.q.toUpperCase(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.country.count({ where }),
      this.prisma.country.findMany({
        where,
        orderBy: this.resolveCountryOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Overlay translations if a language is requested
    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.countryTranslation.findMany({
        where: { countryId: { in: ids }, languageCode: lang },
      });
      const transMap = new Map(translations.map((t) => [t.countryId, t]));
      for (const item of items) {
        const tr = transMap.get(item.id);
        if (tr) {
          item.name = tr.name;
        }
      }
    }

    return { page, pageSize, total, items };
  }

  async listCities(query: ListCitiesDto, lang?: string | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CityWhereInput = {
      countryId: query.countryId,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              {
                normalizedName: {
                  contains: this.normalizeName(query.q),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.city.count({ where }),
      this.prisma.city.findMany({
        where,
        orderBy: this.resolveCityOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Overlay translations if a language is requested
    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.cityTranslation.findMany({
        where: { cityId: { in: ids }, languageCode: lang },
      });
      const transMap = new Map(translations.map((t) => [t.cityId, t]));
      for (const item of items) {
        const tr = transMap.get(item.id);
        if (tr) {
          item.name = tr.name;
        }
      }
    }

    return { page, pageSize, total, items };
  }

  async listLanguages(query: ListLanguagesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.LanguageWhereInput = query.q
      ? {
          OR: [
            { code: { contains: query.q.toLowerCase(), mode: 'insensitive' } },
            { name: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      this.prisma.language.count({ where }),
      this.prisma.language.findMany({
        where,
        orderBy: this.resolveLanguageOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async listCurrencies(query: ListCurrenciesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CurrencyWhereInput = query.q
      ? {
          OR: [
            { code: { contains: query.q.toUpperCase(), mode: 'insensitive' } },
            { name: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      this.prisma.currency.count({ where }),
      this.prisma.currency.findMany({
        where,
        orderBy: this.resolveCurrencyOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async listExchangeRates(query: ListExchangeRatesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ExchangeRateWhereInput = {
      baseCurrency: query.baseCurrency?.toUpperCase(),
      quoteCurrency: query.quoteCurrency?.toUpperCase(),
      effectiveAt: query.effectiveAtFrom
        ? { gte: new Date(query.effectiveAtFrom) }
        : undefined,
      ...(query.q
        ? {
            OR: [
              { baseCurrency: { contains: query.q.toUpperCase(), mode: 'insensitive' } },
              { quoteCurrency: { contains: query.q.toUpperCase(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.exchangeRate.count({ where }),
      this.prisma.exchangeRate.findMany({
        where,
        orderBy: this.resolveExchangeRateOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async createCountry(dto: CreateCountryDto) {
    await this.ensureCurrencyExists(dto.currencyCode);

    try {
      return await this.prisma.country.create({
        data: {
          iso2: dto.iso2.toUpperCase(),
          iso3: dto.iso3.toUpperCase(),
          name: dto.name,
          currencyCode: dto.currencyCode.toUpperCase(),
          imageUrl: dto.imageUrl,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Country ISO code already exists');
    }
  }

  async updateCountry(id: string, dto: UpdateCountryDto) {
    await this.ensureCountryExists(id);

    if (dto.currencyCode) {
      await this.ensureCurrencyExists(dto.currencyCode);
    }

    try {
      return await this.prisma.country.update({
        where: { id },
        data: {
          iso2: dto.iso2?.toUpperCase(),
          iso3: dto.iso3?.toUpperCase(),
          name: dto.name,
          currencyCode: dto.currencyCode?.toUpperCase(),
          imageUrl: dto.imageUrl,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Country ISO code already exists');
    }
  }

  async deleteCountry(id: string) {
    await this.ensureCountryExists(id);

    const [cityCount, supplierCount] = await Promise.all([
      this.prisma.city.count({ where: { countryId: id } }),
      this.prisma.supplier.count({ where: { countryId: id } }),
    ]);

    if (cityCount > 0 || supplierCount > 0) {
      throw new BadRequestException('Country is in use and cannot be deleted');
    }

    await this.prisma.country.delete({ where: { id } });
    return { message: 'Country deleted' };
  }

  async createCity(dto: CreateCityDto) {
    await this.ensureCountryExists(dto.countryId);

    try {
      return await this.prisma.city.create({
        data: {
          countryId: dto.countryId,
          name: dto.name,
          normalizedName: this.normalizeName(dto.name),
          latitude:
            dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : undefined,
          longitude:
            dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : undefined,
          timezone: dto.timezone,
          imageUrl: dto.imageUrl,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'City already exists in this country');
    }
  }

  async updateCity(id: string, dto: UpdateCityDto) {
    await this.ensureCityExists(id);

    if (dto.countryId) {
      await this.ensureCountryExists(dto.countryId);
    }

    try {
      return await this.prisma.city.update({
        where: { id },
        data: {
          countryId: dto.countryId,
          name: dto.name,
          normalizedName: dto.name ? this.normalizeName(dto.name) : undefined,
          latitude:
            dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : undefined,
          longitude:
            dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : undefined,
          timezone: dto.timezone,
          imageUrl: dto.imageUrl,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'City already exists in this country');
    }
  }

  async deleteCity(id: string) {
    await this.ensureCityExists(id);

    const [tourCount, supplierCount] = await Promise.all([
      this.prisma.tour.count({ where: { cityId: id } }),
      this.prisma.supplier.count({ where: { cityId: id } }),
    ]);

    if (tourCount > 0 || supplierCount > 0) {
      throw new BadRequestException('City is in use and cannot be deleted');
    }

    await this.prisma.city.delete({ where: { id } });
    return { message: 'City deleted' };
  }

  async createLanguage(dto: CreateLanguageDto) {
    try {
      return await this.prisma.language.create({
        data: {
          code: dto.code.toLowerCase(),
          name: dto.name,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Language code already exists');
    }
  }

  async updateLanguage(code: string, dto: UpdateLanguageDto) {
    await this.ensureLanguageExists(code.toLowerCase());

    try {
      return await this.prisma.language.update({
        where: { code: code.toLowerCase() },
        data: {
          code: dto.code?.toLowerCase(),
          name: dto.name,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Language code already exists');
    }
  }

  async deleteLanguage(code: string) {
    const normalizedCode = code.toLowerCase();
    await this.ensureLanguageExists(normalizedCode);

    const [
      tourTranslationCount,
      blogTranslationCount,
      cmsTranslationCount,
      faqItemTranslationCount,
      faqCategoryTranslationCount,
      reviewCount,
      templateCount,
    ] = await Promise.all([
      this.prisma.tourTranslation.count({ where: { languageCode: normalizedCode } }),
      this.prisma.blogPostTranslation.count({ where: { languageCode: normalizedCode } }),
      this.prisma.cmsPageTranslation.count({ where: { languageCode: normalizedCode } }),
      this.prisma.supportFaqItemTranslation.count({ where: { languageCode: normalizedCode } }),
      this.prisma.supportFaqCategoryTranslation.count({ where: { languageCode: normalizedCode } }),
      this.prisma.review.count({ where: { languageCode: normalizedCode } }),
      this.prisma.notificationTemplate.count({ where: { languageCode: normalizedCode } }),
    ]);

    if (
      tourTranslationCount > 0 ||
      blogTranslationCount > 0 ||
      cmsTranslationCount > 0 ||
      faqItemTranslationCount > 0 ||
      faqCategoryTranslationCount > 0 ||
      reviewCount > 0 ||
      templateCount > 0
    ) {
      throw new BadRequestException('Language is in use and cannot be deleted');
    }

    await this.prisma.language.delete({ where: { code: normalizedCode } });
    return { message: 'Language deleted' };
  }

  async createCurrency(dto: CreateCurrencyDto) {
    try {
      return await this.prisma.currency.create({
        data: {
          code: dto.code.toUpperCase(),
          name: dto.name,
          symbol: dto.symbol,
          decimals: dto.decimals,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Currency code already exists');
    }
  }

  async updateCurrency(code: string, dto: UpdateCurrencyDto) {
    await this.ensureCurrencyExists(code.toUpperCase());

    try {
      return await this.prisma.currency.update({
        where: { code: code.toUpperCase() },
        data: {
          code: dto.code?.toUpperCase(),
          name: dto.name,
          symbol: dto.symbol,
          decimals: dto.decimals,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Currency code already exists');
    }
  }

  async deleteCurrency(code: string) {
    const normalizedCode = code.toUpperCase();
    await this.ensureCurrencyExists(normalizedCode);

    const [
      countryCount,
      pricingRuleCount,
      bookingCount,
      paymentCount,
      refundCount,
      invoiceCount,
      settlementCount,
      exchangeBaseCount,
      exchangeQuoteCount,
    ] = await Promise.all([
      this.prisma.country.count({ where: { currencyCode: normalizedCode } }),
      this.prisma.optionPricingRule.count({ where: { currencyCode: normalizedCode } }),
      this.prisma.booking.count({ where: { currencyCode: normalizedCode } }),
      this.prisma.payment.count({ where: { currencyCode: normalizedCode } }),
      this.prisma.refund.count({ where: { currencyCode: normalizedCode } }),
      this.prisma.invoice.count({ where: { currencyCode: normalizedCode } }),
      this.prisma.supplierSettlement.count({ where: { currencyCode: normalizedCode } }),
      this.prisma.exchangeRate.count({ where: { baseCurrency: normalizedCode } }),
      this.prisma.exchangeRate.count({ where: { quoteCurrency: normalizedCode } }),
    ]);

    if (
      countryCount > 0 ||
      pricingRuleCount > 0 ||
      bookingCount > 0 ||
      paymentCount > 0 ||
      refundCount > 0 ||
      invoiceCount > 0 ||
      settlementCount > 0 ||
      exchangeBaseCount > 0 ||
      exchangeQuoteCount > 0
    ) {
      throw new BadRequestException('Currency is in use and cannot be deleted');
    }

    await this.prisma.currency.delete({ where: { code: normalizedCode } });
    return { message: 'Currency deleted' };
  }

  async createExchangeRate(dto: CreateExchangeRateDto) {
    if (dto.baseCurrency.toUpperCase() === dto.quoteCurrency.toUpperCase()) {
      throw new BadRequestException('Base and quote currency must be different');
    }

    await Promise.all([
      this.ensureCurrencyExists(dto.baseCurrency),
      this.ensureCurrencyExists(dto.quoteCurrency),
    ]);

    try {
      return await this.prisma.exchangeRate.create({
        data: {
          baseCurrency: dto.baseCurrency.toUpperCase(),
          quoteCurrency: dto.quoteCurrency.toUpperCase(),
          rate: new Prisma.Decimal(dto.rate),
          effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : new Date(),
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'Exchange rate entry already exists for this timestamp');
    }
  }

  async deleteExchangeRate(id: string) {
    const existing = await this.prisma.exchangeRate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Exchange rate not found');
    }

    await this.prisma.exchangeRate.delete({ where: { id } });
    return { message: 'Exchange rate deleted' };
  }

  private normalizeName(value: string) {
    return value.trim().toLowerCase();
  }

  // ─────────────────────────────────────────────────────────────────────
  // Country Translations
  // ─────────────────────────────────────────────────────────────────────

  async getCountryTranslations(countryId: string) {
    await this.ensureCountryExists(countryId);
    return this.prisma.countryTranslation.findMany({
      where: { countryId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertCountryTranslation(countryId: string, dto: UpsertCountryTranslationDto) {
    await this.ensureCountryExists(countryId);
    return this.prisma.countryTranslation.upsert({
      where: {
        countryId_languageCode: {
          countryId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        name: dto.name,
      },
      create: {
        countryId,
        languageCode: dto.languageCode,
        name: dto.name,
      },
    });
  }

  async deleteCountryTranslation(countryId: string, languageCode: string) {
    await this.ensureCountryExists(countryId);
    try {
      return await this.prisma.countryTranslation.delete({
        where: {
          countryId_languageCode: {
            countryId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // City Translations
  // ─────────────────────────────────────────────────────────────────────

  async getCityTranslations(cityId: string) {
    await this.ensureCityExists(cityId);
    return this.prisma.cityTranslation.findMany({
      where: { cityId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertCityTranslation(cityId: string, dto: UpsertCityTranslationDto) {
    await this.ensureCityExists(cityId);
    return this.prisma.cityTranslation.upsert({
      where: {
        cityId_languageCode: {
          cityId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        name: dto.name,
      },
      create: {
        cityId,
        languageCode: dto.languageCode,
        name: dto.name,
      },
    });
  }

  async deleteCityTranslation(cityId: string, languageCode: string) {
    await this.ensureCityExists(cityId);
    try {
      return await this.prisma.cityTranslation.delete({
        where: {
          cityId_languageCode: {
            cityId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Support FAQ Categories CRUD
  // ─────────────────────────────────────────────────────────────────────

  async listFaqCategories(query: { page?: string; pageSize?: string; q?: string }, lang?: string | null) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const pageSize = Math.min(1000, Math.max(1, parseInt(query.pageSize || '20', 10)));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.q) {
      where.name = { contains: query.q, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.supportFaqCategory.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.supportFaqCategory.count({ where }),
    ]);

    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.supportFaqCategoryTranslation.findMany({
        where: { categoryId: { in: ids }, languageCode: lang },
      });
      const transMap = new Map(translations.map((t) => [t.categoryId, t] as const));
      for (const item of items) {
        const tr = transMap.get(item.id);
        if (tr) {
          (item as any).name = tr.name;
          if (tr.description) (item as any).description = tr.description;
        }
      }
    }

    return { page, pageSize, total, items };
  }

  async listFaqItems(query: { page?: string; pageSize?: string; q?: string; categoryId?: string }, lang?: string | null) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const pageSize = Math.min(1000, Math.max(1, parseInt(query.pageSize || '20', 10)));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.q) {
      where.question = { contains: query.q, mode: 'insensitive' };
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const [items, total] = await Promise.all([
      this.prisma.supportFaqItem.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.supportFaqItem.count({ where }),
    ]);

    if (lang && items.length > 0) {
      const ids = items.map((i) => i.id);
      const translations = await this.prisma.supportFaqItemTranslation.findMany({
        where: { itemId: { in: ids }, languageCode: lang },
      });
      const transMap = new Map(translations.map((t) => [t.itemId, t] as const));
      for (const item of items) {
        const tr = transMap.get(item.id);
        if (tr) {
          (item as any).question = tr.question;
          (item as any).answer = tr.answer;
        }
      }
    }

    return { page, pageSize, total, items };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Support FAQ Category CRUD
  // ─────────────────────────────────────────────────────────────────────

  async createFaqCategory(dto: CreateFaqCategoryDto) {
    try {
      return await this.prisma.supportFaqCategory.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'FAQ category with this slug already exists');
    }
  }

  async updateFaqCategory(id: string, dto: UpdateFaqCategoryDto) {
    await this.ensureFaqCategoryExists(id);
    try {
      return await this.prisma.supportFaqCategory.update({
        where: { id },
        data: {
          ...(dto.slug !== undefined && { slug: dto.slug }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'FAQ category with this slug already exists');
    }
  }

  async deleteFaqCategory(id: string) {
    await this.ensureFaqCategoryExists(id);

    // Check if any FAQ items reference this category
    const itemCount = await this.prisma.supportFaqItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      throw new BadRequestException(`Cannot delete: ${itemCount} FAQ item(s) reference this category`);
    }

    await this.prisma.supportFaqCategoryTranslation.deleteMany({ where: { categoryId: id } });
    return this.prisma.supportFaqCategory.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Support FAQ Item CRUD
  // ─────────────────────────────────────────────────────────────────────

  async createFaqItem(dto: CreateFaqItemDto) {
    if (dto.categoryId) {
      await this.ensureFaqCategoryExists(dto.categoryId);
    }
    try {
      return await this.prisma.supportFaqItem.create({
        data: {
          categoryId: dto.categoryId || null,
          slug: dto.slug,
          question: dto.question,
          answer: dto.answer,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'FAQ item with this slug already exists');
    }
  }

  async updateFaqItem(id: string, dto: UpdateFaqItemDto) {
    await this.ensureFaqItemExists(id);
    if (dto.categoryId) {
      await this.ensureFaqCategoryExists(dto.categoryId);
    }
    try {
      return await this.prisma.supportFaqItem.update({
        where: { id },
        data: {
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId || null }),
          ...(dto.slug !== undefined && { slug: dto.slug }),
          ...(dto.question !== undefined && { question: dto.question }),
          ...(dto.answer !== undefined && { answer: dto.answer }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, 'FAQ item with this slug already exists');
    }
  }

  async deleteFaqItem(id: string) {
    await this.ensureFaqItemExists(id);
    await this.prisma.supportFaqItemTranslation.deleteMany({ where: { itemId: id } });
    return this.prisma.supportFaqItem.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Support FAQ Category Translations
  // ─────────────────────────────────────────────────────────────────────

  private async ensureFaqCategoryExists(id: string) {
    const category = await this.prisma.supportFaqCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('FAQ category not found');
    }
    return category;
  }

  private async ensureFaqItemExists(id: string) {
    const item = await this.prisma.supportFaqItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('FAQ item not found');
    }
    return item;
  }

  async getFaqCategoryTranslations(categoryId: string) {
    await this.ensureFaqCategoryExists(categoryId);
    return this.prisma.supportFaqCategoryTranslation.findMany({
      where: { categoryId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertFaqCategoryTranslation(categoryId: string, dto: UpsertSupportFaqCategoryTranslationDto) {
    await this.ensureFaqCategoryExists(categoryId);
    return this.prisma.supportFaqCategoryTranslation.upsert({
      where: {
        categoryId_languageCode: {
          categoryId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        name: dto.name,
        description: dto.description,
      },
      create: {
        categoryId,
        languageCode: dto.languageCode,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async deleteFaqCategoryTranslation(categoryId: string, languageCode: string) {
    await this.ensureFaqCategoryExists(categoryId);
    try {
      return await this.prisma.supportFaqCategoryTranslation.delete({
        where: {
          categoryId_languageCode: {
            categoryId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Support FAQ Item Translations
  // ─────────────────────────────────────────────────────────────────────

  async getFaqItemTranslations(itemId: string) {
    await this.ensureFaqItemExists(itemId);
    return this.prisma.supportFaqItemTranslation.findMany({
      where: { itemId },
      orderBy: [{ languageCode: 'asc' }],
    });
  }

  async upsertFaqItemTranslation(itemId: string, dto: UpsertSupportFaqItemTranslationDto) {
    await this.ensureFaqItemExists(itemId);
    return this.prisma.supportFaqItemTranslation.upsert({
      where: {
        itemId_languageCode: {
          itemId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        question: dto.question,
        answer: dto.answer,
      },
      create: {
        itemId,
        languageCode: dto.languageCode,
        question: dto.question,
        answer: dto.answer,
      },
    });
  }

  async deleteFaqItemTranslation(itemId: string, languageCode: string) {
    await this.ensureFaqItemExists(itemId);
    try {
      return await this.prisma.supportFaqItemTranslation.delete({
        where: {
          itemId_languageCode: {
            itemId,
            languageCode,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Translation not found');
      }
      throw error;
    }
  }

  private async ensureCountryExists(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) {
      throw new NotFoundException('Country not found');
    }
    return country;
  }

  private async ensureCityExists(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) {
      throw new NotFoundException('City not found');
    }
    return city;
  }

  private async ensureLanguageExists(code: string) {
    const language = await this.prisma.language.findUnique({ where: { code } });
    if (!language) {
      throw new NotFoundException('Language not found');
    }
    return language;
  }

  private async ensureCurrencyExists(code: string) {
    const currency = await this.prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!currency) {
      throw new NotFoundException('Currency not found');
    }
    return currency;
  }

  private handleKnownPrismaError(error: unknown, conflictMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(conflictMessage);
    }

    throw error;
  }
}
