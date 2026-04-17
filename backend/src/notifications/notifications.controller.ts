import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { DispatchNotificationsDto } from './dto/dispatch-notifications.dto';
import { ListNotificationTemplatesDto } from './dto/list-notification-templates.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  listMyNotifications(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListNotificationsDto,
  ) {
    return this.notificationsService.listMyNotifications(actor, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  listAdminNotifications(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListNotificationsDto,
  ) {
    return this.notificationsService.listAdminNotifications(actor, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/send')
  createNotification(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.createNotification(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/dispatch')
  dispatchQueuedNotifications(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: DispatchNotificationsDto,
  ) {
    return this.notificationsService.dispatchQueuedNotifications(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/templates')
  listTemplates(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListNotificationTemplatesDto,
  ) {
    return this.notificationsService.listTemplates(actor, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/templates')
  createTemplate(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateNotificationTemplateDto,
  ) {
    return this.notificationsService.createTemplate(actor, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/templates/:id')
  updateTemplate(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(actor, id, dto);
  }
}
