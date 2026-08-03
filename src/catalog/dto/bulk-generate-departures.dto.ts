import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class BulkGenerateDeparturesDto {
  @IsDateString()
  startDate: string; // e.g. '2026-03-08'

  @IsDateString()
  endDate: string; // e.g. '2026-03-22'

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^\d{2}:\d{2}$/, {
    each: true,
    message: 'Each time must be HH:mm format',
  })
  times: string[]; // e.g. ['09:00', '14:00']

  @IsInt()
  @Min(1)
  totalCapacity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;
}
