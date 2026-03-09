import { IsOptional, IsString, Length } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListCountriesDto extends ListQueryDto {

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;
}
