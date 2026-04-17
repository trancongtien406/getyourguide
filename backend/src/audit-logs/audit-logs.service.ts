import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

export type CreateAuditLogInput = {
  actorUserId?: string;
  actorRole?: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Prisma.JsonValue;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveAuditOrderBy(
    query: ListAuditLogsDto,
  ): Prisma.AuditLogOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'action':
        return [{ action: sortOrder }, { createdAt: 'desc' }];
      case 'entitytype':
        return [{ entityType: sortOrder }, { createdAt: 'desc' }];
      case 'actoruserid':
        return [{ actorUserId: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async listAuditLogs(actor: JwtPayload, query: ListAuditLogsDto) {
    this.ensureCanViewAllAuditLogs(actor);
    return this.queryAuditLogs(query);
  }

  async listMyAuditLogs(actor: JwtPayload, query: ListAuditLogsDto) {
    return this.queryAuditLogs({ ...query, actorUserId: actor.sub });
  }

  async getAuditLogById(actor: JwtPayload, id: string) {
    const item = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Audit log not found');
    }

    const roles = new Set(actor.roles);
    if (
      item.actorUserId === actor.sub ||
      roles.has(UserRole.ADMIN) ||
      roles.has(UserRole.OPERATOR)
    ) {
      return item;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  async createAuditLog(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changes: (input.changes ?? null) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  private async queryAuditLogs(query: ListAuditLogsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.AuditLogWhereInput = {
      actorUserId: query.actorUserId,
      actorRole: query.actorRole,
      entityType: query.entityType,
      entityId: query.entityId,
      createdAt:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
      ...(query.action
        ? {
            action: { contains: query.action, mode: 'insensitive' },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { action: { contains: query.q, mode: 'insensitive' } },
              { entityType: { contains: query.q, mode: 'insensitive' } },
              { ipAddress: { contains: query.q, mode: 'insensitive' } },
              { userAgent: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: this.resolveAuditOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items };
  }

  private ensureCanViewAllAuditLogs(actor: JwtPayload) {
    const roles = new Set(actor.roles);
    if (roles.has(UserRole.ADMIN) || roles.has(UserRole.OPERATOR)) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
