import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { DispatchNotificationsDto } from './dto/dispatch-notifications.dto';
import { ListNotificationTemplatesDto } from './dto/list-notification-templates.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveNotificationOrderBy(
    query: ListNotificationsDto,
  ): Prisma.NotificationOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'status':
        return [{ status: sortOrder }, { createdAt: 'desc' }];
      case 'eventkey':
        return [{ eventKey: sortOrder }, { createdAt: 'desc' }];
      case 'recipient':
        return [{ recipient: sortOrder }, { createdAt: 'desc' }];
      case 'sentat':
        return [{ sentAt: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  private resolveTemplateOrderBy(
    query: ListNotificationTemplatesDto,
  ): Prisma.NotificationTemplateOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'eventkey':
        return [{ eventKey: sortOrder }, { createdAt: 'desc' }];
      case 'languagecode':
        return [{ languageCode: sortOrder }, { createdAt: 'desc' }];
      case 'channel':
        return [{ channel: sortOrder }, { createdAt: 'desc' }];
      case 'isactive':
        return [{ isActive: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async listMyNotifications(actor: JwtPayload, query: ListNotificationsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.NotificationWhereInput = {
      userId: actor.sub,
      status: query.status,
      ...(query.q
        ? {
            OR: [
              { eventKey: { contains: query.q, mode: 'insensitive' } },
              { recipient: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: this.resolveNotificationOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async listAdminNotifications(actor: JwtPayload, query: ListNotificationsDto) {
    this.ensureCanManageNotifications(actor);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.NotificationWhereInput = {
      status: query.status,
      ...(query.q
        ? {
            OR: [
              { eventKey: { contains: query.q, mode: 'insensitive' } },
              { recipient: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: this.resolveNotificationOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async createNotification(actor: JwtPayload, dto: CreateNotificationDto) {
    this.ensureCanManageNotifications(actor);

    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        channel: dto.channel,
        recipient: dto.recipient,
        eventKey: dto.eventKey,
        payload: (dto.payload ?? {}) as Prisma.JsonObject,
        status: 'queued',
      },
    });
  }

  async dispatchQueuedNotifications(
    actor: JwtPayload,
    dto: DispatchNotificationsDto,
  ) {
    this.ensureCanManageNotifications(actor);

    const limit = dto.limit ?? 100;
    const queued = await this.prisma.notification.findMany({
      where: { status: 'queued' },
      orderBy: [{ createdAt: 'asc' }],
      take: limit,
    });

    if (!queued.length) {
      return { dispatched: 0 };
    }

    await this.prisma.$transaction(
      queued.map((item) =>
        this.prisma.notification.update({
          where: { id: item.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        }),
      ),
    );

    return { dispatched: queued.length };
  }

  async listTemplates(actor: JwtPayload, query: ListNotificationTemplatesDto) {
    this.ensureCanManageNotifications(actor);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.NotificationTemplateWhereInput = {
      eventKey: query.eventKey,
      channel: query.channel,
      languageCode: query.languageCode,
      isActive: query.isActive,
      ...(query.q
        ? {
            OR: [
              { eventKey: { contains: query.q, mode: 'insensitive' } },
              { languageCode: { contains: query.q, mode: 'insensitive' } },
              { subject: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.notificationTemplate.count({ where }),
      this.prisma.notificationTemplate.findMany({
        where,
        orderBy: this.resolveTemplateOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  async createTemplate(actor: JwtPayload, dto: CreateNotificationTemplateDto) {
    this.ensureCanManageNotifications(actor);

    try {
      return await this.prisma.notificationTemplate.create({
        data: {
          eventKey: dto.eventKey,
          channel: dto.channel,
          languageCode: dto.languageCode,
          subject: dto.subject,
          body: dto.body,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Template already exists for event/channel/language',
        );
      }
      throw error;
    }
  }

  async updateTemplate(
    actor: JwtPayload,
    id: string,
    dto: UpdateNotificationTemplateDto,
  ) {
    this.ensureCanManageNotifications(actor);
    await this.ensureTemplateExists(id);

    return this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        eventKey: dto.eventKey,
        channel: dto.channel,
        languageCode: dto.languageCode,
        subject: dto.subject,
        body: dto.body,
        isActive: dto.isActive,
      },
    });
  }

  private ensureCanManageNotifications(actor: JwtPayload) {
    const roles = new Set(actor.roles);
    if (roles.has(UserRole.ADMIN) || roles.has(UserRole.OPERATOR)) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private async ensureTemplateExists(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Notification template not found');
    }
    return template;
  }
}
