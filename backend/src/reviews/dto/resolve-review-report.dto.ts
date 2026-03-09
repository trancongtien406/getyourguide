import { IsIn, IsString } from 'class-validator';

export class ResolveReviewReportDto {
  @IsString()
  @IsIn(['dismiss', 'action'])
  action: 'dismiss' | 'action';
}
