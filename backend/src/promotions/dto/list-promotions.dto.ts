import { PromoScope, PromoType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListPromotionsDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === '0') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  activeOnly?: boolean;

  @IsOptional()
  @IsEnum(PromoType)
  promoType?: PromoType;

  @IsOptional()
  @IsEnum(PromoScope)
  promoScope?: PromoScope;
}
