import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportReviewDto {
  @IsString()
  @MaxLength(100)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
