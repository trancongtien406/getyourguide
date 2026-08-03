import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetBlogPostTagsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds!: string[];
}
