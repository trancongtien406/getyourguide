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
import { CreateReviewDto } from './dto/create-review.dto';
import { ListTourReviewsDto } from './dto/list-tour-reviews.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { ResolveReviewReportDto } from './dto/resolve-review-report.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { VoteReviewDto } from './dto/vote-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  listMyReviews(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListTourReviewsDto,
  ) {
    return this.reviewsService.listMyReviews(actor, query);
  }

  @Get('tours/:tourId')
  listTourReviews(
    @Param('tourId') tourId: string,
    @Query() query: ListTourReviewsDto,
  ) {
    return this.reviewsService.listTourReviews(tourId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createReview(@CurrentUser() actor: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateMyReview(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateMyReview(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteMyReview(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.reviewsService.deleteMyReview(actor, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  voteReviewHelpful(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VoteReviewDto,
  ) {
    return this.reviewsService.voteReviewHelpful(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/moderate')
  moderateReview(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateReview(actor, id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Review Reports
  // ─────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  reportReview(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewsService.reportReview(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reports/pending')
  listReviewReports(@CurrentUser() actor: JwtPayload) {
    return this.reviewsService.listReviewReports(actor);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('reports/:id/resolve')
  resolveReviewReport(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ResolveReviewReportDto,
  ) {
    return this.reviewsService.resolveReviewReport(actor, id, dto.action);
  }
}
