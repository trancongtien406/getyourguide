import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListApiKeysDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['USER', 'SUPPLIER', 'SYSTEM'])
  ownerType?: 'USER' | 'SUPPLIER' | 'SYSTEM';

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
