import { DepartureSlotStatus } from '@prisma/client';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateDepartureSlotDto {
  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(DepartureSlotStatus)
  status?: DepartureSlotStatus;

  @IsInt()
  @Min(0)
  totalCapacity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  oversellLimit?: number;
}
