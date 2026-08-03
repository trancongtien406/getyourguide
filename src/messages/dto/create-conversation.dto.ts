import { ConversationType } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type!: ConversationType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  participantUserIds?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
