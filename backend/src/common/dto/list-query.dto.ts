import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number;
}

export class ListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).toLowerCase())
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @Transform(({ value }) => String(value).toLowerCase())
  sortOrder?: 'asc' | 'desc';
}