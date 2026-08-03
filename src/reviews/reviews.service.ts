import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  ReviewReportStatus,
  ReviewStatus,
  UserRole,
} from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListTourReviewsDto } from './dto/list-tour-reviews.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { VoteReviewDto } from './dto/vote-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveReviewOrderBy(
    query: ListTourReviewsDto,
  ): Prisma.ReviewOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'rating':
        return [{ rating: sortOrder }, { createdAt: 'desc' }];
      case 'helpfulcount':
        return [{ helpfulCount: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async listMyReviews(actor: JwtPayload, query: ListTourReviewsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ReviewWhereInput = {
      userId: actor.sub,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: { tour: { select: { id: true, slug: true } } },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: items,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async listTourReviews(tourId: string, query: ListTourReviewsDto) {
    await this.ensureTourExists(tourId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ReviewWhereInput = {
      tourId,
      status: query.status ?? ReviewStatus.PUBLISHED,
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items, summary, subRatingSummary] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: this.resolveReviewOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { firstName: true, lastName: true, displayCountry: true },
          },
        },
      }),
      this.prisma.review.aggregate({
        where: {
          tourId,
          status: ReviewStatus.PUBLISHED,
        },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.review.aggregate({
        where: {
          tourId,
          status: ReviewStatus.PUBLISHED,
        },
        _avg: {
          ratingGuide: true,
          ratingTransport: true,
          ratingValue: true,
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      averageRating: summary._avg.rating ?? 0,
      averageRatingGuide: subRatingSummary._avg.ratingGuide ?? null,
      averageRatingTransport: subRatingSummary._avg.ratingTransport ?? null,
      averageRatingValue: subRatingSummary._avg.ratingValue ?? null,
      publishedCount: summary._count._all,
      items,
    };
  }

  async createReview(actor: JwtPayload, dto: CreateReviewDto) {
    await this.ensureTourExists(dto.tourId);
    const verification = await this.validateReviewBooking(
      actor.sub,
      dto.tourId,
      dto.bookingId,
    );

    const status = verification.verifiedBooking
      ? ReviewStatus.PUBLISHED
      : ReviewStatus.PENDING;

    const review = await this.prisma.review.create({
      data: {
        tourId: dto.tourId,
        bookingId: verification.bookingId,
        userId: actor.sub,
        rating: dto.rating,
        ratingGuide: dto.ratingGuide,
        ratingTransport: dto.ratingTransport,
        ratingValue: dto.ratingValue,
        title: dto.title,
        body: dto.body,
        languageCode: dto.languageCode,
        status,
        verifiedBooking: verification.verifiedBooking,
      },
    });

    if (status === ReviewStatus.PUBLISHED) {
      await this.recalculateTourRating(dto.tourId);
    }

    return review;
  }

  async updateMyReview(
    actor: JwtPayload,
    reviewId: string,
    dto: UpdateReviewDto,
  ) {
    const review = await this.ensureReviewExists(reviewId);
    if (review.userId !== actor.sub) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        ratingGuide: dto.ratingGuide,
        ratingTransport: dto.ratingTransport,
        ratingValue: dto.ratingValue,
        title: dto.title,
        body: dto.body,
        languageCode: dto.languageCode,
        status: review.verifiedBooking
          ? ReviewStatus.PUBLISHED
          : ReviewStatus.PENDING,
      },
    });

    await this.recalculateTourRating(review.tourId);
    return updated;
  }

  async deleteMyReview(actor: JwtPayload, reviewId: string) {
    const review = await this.ensureReviewExists(reviewId);
    if (review.userId !== actor.sub) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.reviewVote.deleteMany({ where: { reviewId } });
    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.recalculateTourRating(review.tourId);

    return { message: 'Review deleted' };
  }

  async voteReviewHelpful(
    actor: JwtPayload,
    reviewId: string,
    dto: VoteReviewDto,
  ) {
    await this.ensureReviewExists(reviewId);

    await this.prisma.reviewVote.upsert({
      where: {
        reviewId_userId: {
          reviewId,
          userId: actor.sub,
        },
      },
      update: {
        isHelpful: dto.isHelpful,
      },
      create: {
        reviewId,
        userId: actor.sub,
        isHelpful: dto.isHelpful,
      },
    });

    const helpfulCount = await this.prisma.reviewVote.count({
      where: {
        reviewId,
        isHelpful: true,
      },
    });

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount,
      },
    });
  }

  async moderateReview(
    actor: JwtPayload,
    reviewId: string,
    dto: ModerateReviewDto,
  ) {
    this.ensureCanModerate(actor);
    const review = await this.ensureReviewExists(reviewId);

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: dto.status,
      },
    });

    await this.recalculateTourRating(review.tourId);
    return updated;
  }

  private async validateReviewBooking(
    userId: string,
    tourId: string,
    bookingId?: string,
  ) {
    if (!bookingId) {
      return { verifiedBooking: false, bookingId: null as string | null };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Booking does not belong to user');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be reviewed');
    }

    const bookingItem = await this.prisma.bookingItem.findFirst({
      where: {
        bookingId,
        tourId,
      },
    });
    if (!bookingItem) {
      throw new BadRequestException('Booking is not related to this tour');
    }

    return { verifiedBooking: true, bookingId };
  }

  private async recalculateTourRating(tourId: string) {
    const [summary, subRatings] = await Promise.all([
      this.prisma.review.aggregate({
        where: {
          tourId,
          status: ReviewStatus.PUBLISHED,
        },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.review.aggregate({
        where: {
          tourId,
          status: ReviewStatus.PUBLISHED,
        },
        _avg: {
          ratingGuide: true,
          ratingTransport: true,
          ratingValue: true,
        },
      }),
    ]);

    await this.prisma.tour.update({
      where: { id: tourId },
      data: {
        ratingAvg: summary._avg.rating
          ? new Prisma.Decimal(summary._avg.rating)
          : null,
        ratingCount: summary._count._all,
        ratingGuideAvg: subRatings._avg.ratingGuide
          ? new Prisma.Decimal(subRatings._avg.ratingGuide)
          : null,
        ratingTransportAvg: subRatings._avg.ratingTransport
          ? new Prisma.Decimal(subRatings._avg.ratingTransport)
          : null,
        ratingValueAvg: subRatings._avg.ratingValue
          ? new Prisma.Decimal(subRatings._avg.ratingValue)
          : null,
      },
    });
  }

  private ensureCanModerate(actor: JwtPayload) {
    const actorRoles = new Set(actor.roles);
    if (actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR)) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private async ensureReviewExists(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Review Reports
  // ─────────────────────────────────────────────────────────────────────

  async reportReview(
    actor: JwtPayload,
    reviewId: string,
    dto: ReportReviewDto,
  ) {
    await this.ensureReviewExists(reviewId);

    try {
      return await this.prisma.reviewReport.create({
        data: {
          reviewId,
          userId: actor.sub,
          reason: dto.reason,
          details: dto.details,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('You have already reported this review');
      }
      throw error;
    }
  }

  async listReviewReports(actor: JwtPayload) {
    this.ensureCanModerate(actor);

    return this.prisma.reviewReport.findMany({
      where: { status: ReviewReportStatus.PENDING },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });
  }

  async resolveReviewReport(
    actor: JwtPayload,
    reportId: string,
    action: 'dismiss' | 'action',
  ) {
    this.ensureCanModerate(actor);

    const report = await this.prisma.reviewReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('Review report not found');
    }

    const status =
      action === 'dismiss'
        ? ReviewReportStatus.DISMISSED
        : ReviewReportStatus.ACTION_TAKEN;

    const updated = await this.prisma.reviewReport.update({
      where: { id: reportId },
      data: {
        status,
        resolvedBy: actor.sub,
        resolvedAt: new Date(),
      },
    });

    if (action === 'action') {
      await this.prisma.review.update({
        where: { id: report.reviewId },
        data: { status: ReviewStatus.HIDDEN },
      });

      const review = await this.ensureReviewExists(report.reviewId);
      await this.recalculateTourRating(review.tourId);
    }

    return updated;
  }

  private async ensureTourExists(tourId: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    return tour;
  }
}
