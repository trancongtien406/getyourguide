import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class RelatedTourItemDto {
  @IsUUID()
  tourId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class SetBlogPostRelatedToursDto {
  @IsArray()
  @ArrayUnique((item: RelatedTourItemDto) => item.tourId)
  @ValidateNested({ each: true })
  @Type(() => RelatedTourItemDto)
  items!: RelatedTourItemDto[];
}
