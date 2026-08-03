import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListNotificationsDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}
