import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateItineraryStopDto {
  @IsInt()
  @Min(0)
  stopOrder: number;

  @IsString()
  @MaxLength(250)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  transportMode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  transportDurationMinutes?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
