import { DepartureSlotStatus } from '@prisma/client';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class UpdateDepartureSlotDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(DepartureSlotStatus)
  status?: DepartureSlotStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  oversellLimit?: number;
}
