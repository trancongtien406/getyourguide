import { PromoScope, PromoType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';

export class ListPublicPromotionsDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(PromoType)
  promoType?: PromoType;

  @IsOptional()
  @IsEnum(PromoScope)
  promoScope?: PromoScope;
}
