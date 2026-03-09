import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsOptional,
    IsUUID,
    ValidateNested,
} from 'class-validator';

class PromotionScopeEntryDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  tourId?: string;

  @IsOptional()
  @IsUUID()
  tourOptionId?: string;
}

export class SetPromotionScopesDto {
  @IsArray()
  @ArrayUnique((item: PromotionScopeEntryDto) =>
    [item.supplierId, item.tourId, item.tourOptionId].filter(Boolean).join('|'),
  )
  @ValidateNested({ each: true })
  @Type(() => PromotionScopeEntryDto)
  entries!: PromotionScopeEntryDto[];
}
