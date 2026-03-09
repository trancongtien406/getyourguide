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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Locale, type RequestLocale } from '../common/decorators/locale.decorator';
import { CatalogService } from './catalog.service';
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

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('tours')
  listTours(@Query() query: ListToursDto, @Locale() locale: RequestLocale) {
    return this.catalogService.listTours(query, locale.language, locale.currency);
  }

  @Get('tours/search')
  searchTours(@Query() query: SearchToursDto, @Locale() locale: RequestLocale) {
    return this.catalogService.searchTours(query, locale.language, locale.currency);
  }

  @Get('tours/by-slug/:slug')
  getTourBySlug(@Param('slug') slug: string, @Locale() locale: RequestLocale) {
    return this.catalogService.getTourBySlug(slug, locale.language, locale.currency);
  }

  @Get('tours/:id')
  getTourById(@Param('id') id: string, @Locale() locale: RequestLocale) {
    return this.catalogService.getTourById(id, locale.language, locale.currency);
  }

  @Get('tours/:id/translations')
  getTourTranslations(@Param('id') id: string) {
    return this.catalogService.getTourTranslations(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tours')
  createTour(@CurrentUser() actor: JwtPayload, @Body() dto: CreateTourDto) {
    return this.catalogService.createTour(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tours/:id')
  updateTour(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTourDto,
  ) {
    return this.catalogService.updateTour(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tours/:id/categories')
  setTourCategories(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetTourCategoriesDto,
  ) {
    return this.catalogService.setTourCategories(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tours/:id/tags')
  setTourTags(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetTourTagsDto,
  ) {
    return this.catalogService.setTourTags(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tours/:id/media')
  addTourMedia(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateTourMediaDto,
  ) {
    return this.catalogService.addTourMedia(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tour-media/:id')
  updateTourMedia(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTourMediaDto,
  ) {
    return this.catalogService.updateTourMedia(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tour-media/:id')
  deleteTourMedia(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.catalogService.deleteTourMedia(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tours/:id/status')
  setTourStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetTourStatusDto,
  ) {
    return this.catalogService.setTourStatus(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tours/:id/translations')
  upsertTourTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpsertTourTranslationDto,
  ) {
    return this.catalogService.upsertTourTranslation(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tours/:id/translations/:languageCode')
  deleteTourTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.catalogService.deleteTourTranslation(actor, id, languageCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tours/:tourId/options')
  createTourOption(
    @CurrentUser() actor: JwtPayload,
    @Param('tourId') tourId: string,
    @Body() dto: CreateTourOptionDto,
  ) {
    return this.catalogService.createTourOption(actor, tourId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tour-options/:id')
  updateTourOption(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTourOptionDto,
  ) {
    return this.catalogService.updateTourOption(actor, id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Tour Option Translations
  // ─────────────────────────────────────────────────────────────────────

  @Get('tour-options/:id/translations')
  getTourOptionTranslations(@Param('id') id: string) {
    return this.catalogService.getTourOptionTranslations(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tour-options/:id/translations')
  upsertTourOptionTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpsertTourOptionTranslationDto,
  ) {
    return this.catalogService.upsertTourOptionTranslation(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tour-options/:id/translations/:languageCode')
  deleteTourOptionTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.catalogService.deleteTourOptionTranslation(actor, id, languageCode);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tour-options/:optionId/departures')
  listDepartureSlots(@Param('optionId') optionId: string) {
    return this.catalogService.listDepartureSlots(optionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tour-options/:optionId/departures/generate')
  bulkGenerateDepartures(
    @CurrentUser() actor: JwtPayload,
    @Param('optionId') optionId: string,
    @Body() dto: BulkGenerateDeparturesDto,
  ) {
    return this.catalogService.bulkGenerateDepartures(actor, optionId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tour-options/:optionId/departures')
  createDepartureSlot(
    @CurrentUser() actor: JwtPayload,
    @Param('optionId') optionId: string,
    @Body() dto: CreateDepartureSlotDto,
  ) {
    return this.catalogService.createDepartureSlot(actor, optionId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('departures/:id')
  deleteDepartureSlot(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.catalogService.deleteDepartureSlot(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('departures/:id')
  updateDepartureSlot(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDepartureSlotDto,
  ) {
    return this.catalogService.updateDepartureSlot(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tour-options/:optionId/pricing-rules')
  createPricingRule(
    @CurrentUser() actor: JwtPayload,
    @Param('optionId') optionId: string,
    @Body() dto: CreatePricingRuleDto,
  ) {
    return this.catalogService.createPricingRule(actor, optionId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('pricing-rules/:id')
  updatePricingRule(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
  ) {
    return this.catalogService.updatePricingRule(actor, id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Tour Itinerary
  // ─────────────────────────────────────────────────────────────────────

  @Get('tours/:tourId/itinerary')
  getTourItinerary(@Param('tourId') tourId: string) {
    return this.catalogService.getTourItinerary(tourId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tours/:tourId/itinerary')
  createItineraryStop(
    @CurrentUser() actor: JwtPayload,
    @Param('tourId') tourId: string,
    @Body() dto: CreateItineraryStopDto,
  ) {
    return this.catalogService.createItineraryStop(actor, tourId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('itinerary-stops/:id')
  updateItineraryStop(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateItineraryStopDto,
  ) {
    return this.catalogService.updateItineraryStop(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('itinerary-stops/:id')
  deleteItineraryStop(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.catalogService.deleteItineraryStop(actor, id);
  }

  @Get('itinerary-stops/:id/translations')
  getItineraryStopTranslations(@Param('id') id: string) {
    return this.catalogService.getItineraryStopTranslations(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('itinerary-stops/:id/translations')
  upsertItineraryStopTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpsertItineraryStopTranslationDto,
  ) {
    return this.catalogService.upsertItineraryStopTranslation(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('itinerary-stops/:id/translations/:languageCode')
  deleteItineraryStopTranslation(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.catalogService.deleteItineraryStopTranslation(actor, id, languageCode);
  }
}
