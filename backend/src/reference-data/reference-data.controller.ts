import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Locale, type RequestLocale } from '../common/decorators/locale.decorator';
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
import { ReferenceDataService } from './reference-data.service';

@Controller('reference-data')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @Get('countries')
  listCountries(@Query() query: ListCountriesDto, @Locale() locale: RequestLocale) {
    return this.referenceDataService.listCountries(query, locale.language);
  }

  @Get('cities')
  listCities(@Query() query: ListCitiesDto, @Locale() locale: RequestLocale) {
    return this.referenceDataService.listCities(query, locale.language);
  }

  @Get('languages')
  listLanguages(@Query() query: ListLanguagesDto) {
    return this.referenceDataService.listLanguages(query);
  }

  @Get('currencies')
  listCurrencies(@Query() query: ListCurrenciesDto) {
    return this.referenceDataService.listCurrencies(query);
  }

  @Get('exchange-rates')
  listExchangeRates(@Query() query: ListExchangeRatesDto) {
    return this.referenceDataService.listExchangeRates(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('countries')
  createCountry(@Body() dto: CreateCountryDto) {
    return this.referenceDataService.createCountry(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch('countries/:id')
  updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.referenceDataService.updateCountry(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('countries/:id')
  deleteCountry(@Param('id') id: string) {
    return this.referenceDataService.deleteCountry(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('cities')
  createCity(@Body() dto: CreateCityDto) {
    return this.referenceDataService.createCity(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch('cities/:id')
  updateCity(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.referenceDataService.updateCity(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('cities/:id')
  deleteCity(@Param('id') id: string) {
    return this.referenceDataService.deleteCity(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('languages')
  createLanguage(@Body() dto: CreateLanguageDto) {
    return this.referenceDataService.createLanguage(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch('languages/:code')
  updateLanguage(@Param('code') code: string, @Body() dto: UpdateLanguageDto) {
    return this.referenceDataService.updateLanguage(code, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('languages/:code')
  deleteLanguage(@Param('code') code: string) {
    return this.referenceDataService.deleteLanguage(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('currencies')
  createCurrency(@Body() dto: CreateCurrencyDto) {
    return this.referenceDataService.createCurrency(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch('currencies/:code')
  updateCurrency(@Param('code') code: string, @Body() dto: UpdateCurrencyDto) {
    return this.referenceDataService.updateCurrency(code, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('currencies/:code')
  deleteCurrency(@Param('code') code: string) {
    return this.referenceDataService.deleteCurrency(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('exchange-rates')
  createExchangeRate(@Body() dto: CreateExchangeRateDto) {
    return this.referenceDataService.createExchangeRate(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('exchange-rates/:id')
  deleteExchangeRate(@Param('id') id: string) {
    return this.referenceDataService.deleteExchangeRate(id);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Country Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('countries/:id/translations')
  getCountryTranslations(@Param('id') id: string) {
    return this.referenceDataService.getCountryTranslations(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('countries/:id/translations')
  upsertCountryTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertCountryTranslationDto,
  ) {
    return this.referenceDataService.upsertCountryTranslation(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('countries/:id/translations/:languageCode')
  deleteCountryTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.referenceDataService.deleteCountryTranslation(id, languageCode);
  }

  // ─────────────────────────────────────────────────────────────────────
  // City Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('cities/:id/translations')
  getCityTranslations(@Param('id') id: string) {
    return this.referenceDataService.getCityTranslations(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('cities/:id/translations')
  upsertCityTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertCityTranslationDto,
  ) {
    return this.referenceDataService.upsertCityTranslation(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('cities/:id/translations/:languageCode')
  deleteCityTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.referenceDataService.deleteCityTranslation(id, languageCode);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FAQ Categories & Items Listing
  // ─────────────────────────────────────────────────────────────────────

  @Get('faq-categories')
  listFaqCategories(@Query() query: Record<string, string>, @Locale() locale: RequestLocale) {
    return this.referenceDataService.listFaqCategories(query, locale.language);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('faq-categories')
  createFaqCategory(@Body() dto: CreateFaqCategoryDto) {
    return this.referenceDataService.createFaqCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch('faq-categories/:id')
  updateFaqCategory(@Param('id') id: string, @Body() dto: UpdateFaqCategoryDto) {
    return this.referenceDataService.updateFaqCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('faq-categories/:id')
  deleteFaqCategory(@Param('id') id: string) {
    return this.referenceDataService.deleteFaqCategory(id);
  }

  @Get('faq-items')
  listFaqItems(@Query() query: Record<string, string>, @Locale() locale: RequestLocale) {
    return this.referenceDataService.listFaqItems(query, locale.language);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('faq-items')
  createFaqItem(@Body() dto: CreateFaqItemDto) {
    return this.referenceDataService.createFaqItem(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Patch('faq-items/:id')
  updateFaqItem(@Param('id') id: string, @Body() dto: UpdateFaqItemDto) {
    return this.referenceDataService.updateFaqItem(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('faq-items/:id')
  deleteFaqItem(@Param('id') id: string) {
    return this.referenceDataService.deleteFaqItem(id);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FAQ Category Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('faq-categories/:id/translations')
  getFaqCategoryTranslations(@Param('id') id: string) {
    return this.referenceDataService.getFaqCategoryTranslations(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('faq-categories/:id/translations')
  upsertFaqCategoryTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertSupportFaqCategoryTranslationDto,
  ) {
    return this.referenceDataService.upsertFaqCategoryTranslation(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('faq-categories/:id/translations/:languageCode')
  deleteFaqCategoryTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.referenceDataService.deleteFaqCategoryTranslation(id, languageCode);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FAQ Item Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('faq-items/:id/translations')
  getFaqItemTranslations(@Param('id') id: string) {
    return this.referenceDataService.getFaqItemTranslations(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('faq-items/:id/translations')
  upsertFaqItemTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertSupportFaqItemTranslationDto,
  ) {
    return this.referenceDataService.upsertFaqItemTranslation(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Delete('faq-items/:id/translations/:languageCode')
  deleteFaqItemTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.referenceDataService.deleteFaqItemTranslation(id, languageCode);
  }
}
