import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListFavoriteToursDto } from './dto/list-favorite-tours.dto';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('tours')
  listMyFavoriteTours(@CurrentUser() actor: JwtPayload, @Query() query: ListFavoriteToursDto) {
    return this.favoritesService.listMyFavoriteTours(actor.sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tours/:tourId')
  addFavoriteTour(
    @CurrentUser() actor: JwtPayload,
    @Param('tourId') tourId: string,
  ) {
    return this.favoritesService.addFavoriteTour(actor.sub, tourId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tours/:tourId')
  removeFavoriteTour(
    @CurrentUser() actor: JwtPayload,
    @Param('tourId') tourId: string,
  ) {
    return this.favoritesService.removeFavoriteTour(actor.sub, tourId);
  }
}
