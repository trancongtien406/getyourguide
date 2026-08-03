import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListCategoriesDto extends ListQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}
