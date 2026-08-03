import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsIn(['USER', 'SUPPLIER', 'SYSTEM'])
  ownerType?: 'USER' | 'SUPPLIER' | 'SYSTEM';

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
