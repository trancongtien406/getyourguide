import { NotificationChannel } from '@prisma/client';
import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateNotificationTemplateDto {
  @IsString()
  @MaxLength(120)
  eventKey!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
