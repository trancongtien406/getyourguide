import { TourStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetTourStatusDto {
  @IsEnum(TourStatus)
  status: TourStatus;
}
