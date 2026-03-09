import { NotificationChannel } from '@prisma/client';
import {
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsString()
  @MaxLength(255)
  recipient!: string;

  @IsString()
  @MaxLength(120)
  eventKey!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
