import {
    Body,
    Controller,
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
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListPromotionsDto } from './dto/list-promotions.dto';
import { ListPublicPromotionsDto } from './dto/list-public-promotions.dto';
import { RedeemPromotionDto } from './dto/redeem-promotion.dto';
import { SetPromotionScopesDto } from './dto/set-promotion-scopes.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionsService } from './promotions.service';
 
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('public')
  listPublicPromotions(@Query() query: ListPublicPromotionsDto) {
    return this.promotionsService.listPublicPromotions(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  listAdminPromotions(@CurrentUser() actor: JwtPayload, @Query() query: ListPromotionsDto) {
    return this.promotionsService.listAdminPromotions(actor, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/:id')
  getPromotionById(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.promotionsService.getPromotionById(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin')
  createPromotion(@CurrentUser() actor: JwtPayload, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.createPromotion(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id')
  updatePromotion(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.updatePromotion(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id/scopes')
  setPromotionScopes(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetPromotionScopesDto,
  ) {
    return this.promotionsService.setPromotionScopes(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  redeemPromotion(@CurrentUser() actor: JwtPayload, @Body() dto: RedeemPromotionDto) {
    return this.promotionsService.redeemPromotion(actor, dto);
  }
}
