import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListFavoriteToursDto } from './dto/list-favorite-tours.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveFavoritesOrderBy(
    query: ListFavoriteToursDto,
  ): Prisma.UserFavoriteTourOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'tourid':
        return [{ tourId: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async listMyFavoriteTours(userId: string, query: ListFavoriteToursDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    let filteredTourIds: string[] | undefined;
    if (query.q) {
      const matchedTours = await this.prisma.tour.findMany({
        where: {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { slug: { contains: query.q, mode: 'insensitive' } },
            { shortDescription: { contains: query.q, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      filteredTourIds = matchedTours.map((tour) => tour.id);
      if (!filteredTourIds.length) {
        return { page, pageSize, total: 0, items: [] };
      }
    }

    const where: Prisma.UserFavoriteTourWhereInput = {
      userId,
      ...(filteredTourIds ? { tourId: { in: filteredTourIds } } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.userFavoriteTour.count({ where }),
      this.prisma.userFavoriteTour.findMany({
        where,
        orderBy: this.resolveFavoritesOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const tourIds = rows.map((row) => row.tourId);

    if (tourIds.length === 0) {
      return { page, pageSize, total, items: [] };
    }

    const [tours, allMedia, allOptions] = await Promise.all([
      this.prisma.tour.findMany({
        where: { id: { in: tourIds } },
      }),
      this.prisma.tourMedia.findMany({
        where: { tourId: { in: tourIds } },
        orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
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

    const items = rows.map((row) => {
      const tour = tours.find((t) => t.id === row.tourId);
      if (!tour) return { ...row, tour: null };
      const media = allMedia.filter((m) => m.tourId === tour.id);
      const options = allOptions
        .filter((o) => o.tourId === tour.id)
        .map((o) => ({
          ...o,
          pricingRules: allPricingRules.filter((r) => r.tourOptionId === o.id),
        }));
      return { ...row, tour: { ...tour, media, options } };
    });

    return { page, pageSize, total, items };
  }

  async addFavoriteTour(userId: string, tourId: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    try {
      return await this.prisma.userFavoriteTour.create({
        data: {
          userId,
          tourId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Tour is already in favorites');
      }
      throw error;
    }
  }

  async removeFavoriteTour(userId: string, tourId: string) {
    await this.prisma.userFavoriteTour.deleteMany({
      where: {
        userId,
        tourId,
      },
    });

    return { message: 'Removed from favorites' };
  }
}