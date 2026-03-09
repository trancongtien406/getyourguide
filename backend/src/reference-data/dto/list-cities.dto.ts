import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListCitiesDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  countryId?: string;
}
