import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePresignedUploadDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z]+\/[a-z0-9.+-]+$/i)
  contentType: string;

  @IsOptional()
  @IsString()
  @IsIn(['tour-media', 'blog-media', 'avatar', 'reference-data'])
  folder?: 'tour-media' | 'blog-media' | 'avatar' | 'reference-data';
}
