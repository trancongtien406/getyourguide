import {
    IsDateString,
    IsOptional,
    IsString,
    Length,
} from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListExchangeRatesDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  baseCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  quoteCurrency?: string;

  @IsOptional()
  @IsDateString()
  effectiveAtFrom?: string;
}
