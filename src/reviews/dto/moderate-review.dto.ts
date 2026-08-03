import { ReviewStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}
