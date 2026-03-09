import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ListApiKeysDto } from './dto/list-api-keys.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

type OwnerType = 'USER' | 'SUPPLIER' | 'SYSTEM';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private resolveApiKeyOrderBy(query: ListApiKeysDto): Prisma.ApiKeyOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'name':
        return [{ name: sortOrder }, { createdAt: 'desc' }];
      case 'expiresat':
        return [{ expiresAt: sortOrder }, { createdAt: 'desc' }];
      case 'lastusedat':
        return [{ lastUsedAt: sortOrder }, { createdAt: 'desc' }];
      case 'isactive':
        return [{ isActive: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async listApiKeys(actor: JwtPayload, query: ListApiKeysDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const access = await this.resolveAccessibleOwners(actor);
    const where = await this.buildListWhere(query, access);

    const [total, rows] = await Promise.all([
      this.prisma.apiKey.count({ where }),
      this.prisma.apiKey.findMany({
        where,
        orderBy: this.resolveApiKeyOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = rows.map((item) => this.toSafeApiKey(item));
    return { page, pageSize, total, items };
  }

  async getApiKeyById(actor: JwtPayload, id: string) {
    const key = await this.ensureApiKeyExists(id);
    await this.ensureCanAccessApiKey(actor, key);
    return this.toSafeApiKey(key);
  }

  async createApiKey(actor: JwtPayload, dto: CreateApiKeyDto) {
    const owner = await this.resolveOwnerFromDto(actor, dto);

    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = this.computePrefix(rawKey);

    const created = await this.prisma.apiKey.create({
      data: {
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        keyPrefix,
        keyHash,
        name: dto.name,
        scopes: dto.scopes ?? [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    const actorRole = this.resolvePrimaryRole(actor.roles);
    await this.auditLogsService.createAuditLog({
      actorUserId: actor.sub,
      actorRole,
      action: 'API_KEY_CREATED',
      entityType: 'ApiKey',
      entityId: created.id,
      changes: {
        ownerType: created.ownerType,
        ownerId: created.ownerId,
        scopes: created.scopes,
        name: created.name,
      },
    });

    return {
      ...this.toSafeApiKey(created),
      plainKey: rawKey,
    };
  }

  async updateApiKey(actor: JwtPayload, id: string, dto: UpdateApiKeyDto) {
    const key = await this.ensureApiKeyExists(id);
    await this.ensureCanAccessApiKey(actor, key);

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: {
        name: dto.name,
        scopes: dto.scopes,
        isActive: dto.isActive,
        expiresAt:
          dto.expiresAt === null
            ? null
            : dto.expiresAt
              ? new Date(dto.expiresAt)
              : undefined,
      },
    });

    const actorRole = this.resolvePrimaryRole(actor.roles);
    await this.auditLogsService.createAuditLog({
      actorUserId: actor.sub,
      actorRole,
      action: 'API_KEY_UPDATED',
      entityType: 'ApiKey',
      entityId: updated.id,
      changes: {
        name: updated.name,
        scopes: updated.scopes,
        isActive: updated.isActive,
        expiresAt: updated.expiresAt?.toISOString() ?? null,
      },
    });

    return this.toSafeApiKey(updated);
  }

  async revokeApiKey(actor: JwtPayload, id: string) {
    const key = await this.ensureApiKeyExists(id);
    await this.ensureCanAccessApiKey(actor, key);

    const revoked = await this.prisma.apiKey.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    const actorRole = this.resolvePrimaryRole(actor.roles);
    await this.auditLogsService.createAuditLog({
      actorUserId: actor.sub,
      actorRole,
      action: 'API_KEY_REVOKED',
      entityType: 'ApiKey',
      entityId: revoked.id,
      changes: {
        isActive: false,
      },
    });

    return this.toSafeApiKey(revoked);
  }

  private async buildListWhere(
    query: ListApiKeysDto,
    access: { isAdminOrOperator: boolean; userId: string; supplierIds: string[] },
  ): Promise<Prisma.ApiKeyWhereInput> {
    const ownerType = query.ownerType;
    const ownerId = query.ownerId;

    const accessibleOwnerClause: Prisma.ApiKeyWhereInput = access.isAdminOrOperator
      ? {
          ownerType,
          ownerId,
        }
      : {
          OR: [
            {
              ownerType: 'USER',
              ownerId: access.userId,
            },
            ...(access.supplierIds.length
              ? [
                  {
                    ownerType: 'SUPPLIER',
                    ownerId: {
                      in: access.supplierIds,
                    },
                  },
                ]
              : []),
          ],
        };

    if (!access.isAdminOrOperator && ownerType === 'SYSTEM') {
      throw new ForbiddenException('Insufficient permissions');
    }

    return {
      ...accessibleOwnerClause,
      isActive: query.isActive,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { keyPrefix: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async resolveOwnerFromDto(actor: JwtPayload, dto: CreateApiKeyDto) {
    const roles = new Set(actor.roles);
    const isAdminOrOperator = roles.has(UserRole.ADMIN) || roles.has(UserRole.OPERATOR);

    const ownerType: OwnerType = dto.ownerType ?? 'USER';
    const ownerId = dto.ownerId ?? actor.sub;

    if (ownerType === 'USER') {
      if (!isAdminOrOperator && ownerId !== actor.sub) {
        throw new ForbiddenException('You can only create user keys for yourself');
      }

      await this.ensureUserExists(ownerId);
      return { ownerType, ownerId };
    }

    if (ownerType === 'SUPPLIER') {
      if (!dto.ownerId) {
        throw new BadRequestException('ownerId is required for supplier keys');
      }

      if (!isAdminOrOperator) {
        await this.ensureSupplierMembership(actor.sub, dto.ownerId);
      }

      return { ownerType, ownerId: dto.ownerId };
    }

    if (!isAdminOrOperator) {
      throw new ForbiddenException('Only admin/operator can create system keys');
    }

    return { ownerType, ownerId };
  }

  private async ensureCanAccessApiKey(
    actor: JwtPayload,
    key: {
      ownerType: string;
      ownerId: string;
    },
  ) {
    const roles = new Set(actor.roles);
    if (roles.has(UserRole.ADMIN) || roles.has(UserRole.OPERATOR)) {
      return;
    }

    if (key.ownerType === 'USER' && key.ownerId === actor.sub) {
      return;
    }

    if (key.ownerType === 'SUPPLIER') {
      await this.ensureSupplierMembership(actor.sub, key.ownerId);
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private async resolveAccessibleOwners(actor: JwtPayload) {
    const roles = new Set(actor.roles);
    const isAdminOrOperator = roles.has(UserRole.ADMIN) || roles.has(UserRole.OPERATOR);

    const supplierIds = isAdminOrOperator
      ? []
      : await this.getActorSupplierIds(actor.sub);

    return {
      isAdminOrOperator,
      userId: actor.sub,
      supplierIds,
    };
  }

  private async getActorSupplierIds(userId: string) {
    const memberships = await this.prisma.supplierUser.findMany({
      where: { userId },
      select: { supplierId: true },
    });

    return [...new Set(memberships.map((item) => item.supplierId))];
  }

  private async ensureSupplierMembership(userId: string, supplierId: string) {
    const membership = await this.prisma.supplierUser.findFirst({
      where: {
        userId,
        supplierId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this supplier');
    }
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async ensureApiKeyExists(id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) {
      throw new NotFoundException('Api key not found');
    }
    return key;
  }

  private generateRawKey() {
    return `gyg_${randomBytes(32).toString('hex')}`;
  }

  private computePrefix(rawKey: string) {
    return rawKey.slice(0, 16);
  }

  private hashKey(rawKey: string) {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  private toSafeApiKey(item: {
    id: string;
    ownerType: string;
    ownerId: string;
    keyPrefix: string;
    name: string;
    scopes: string[];
    isActive: boolean;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: item.id,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      keyPrefix: item.keyPrefix,
      name: item.name,
      scopes: item.scopes,
      isActive: item.isActive,
      lastUsedAt: item.lastUsedAt,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
    };
  }

  private resolvePrimaryRole(roles: UserRole[]) {
    const set = new Set(roles);
    if (set.has(UserRole.ADMIN)) return UserRole.ADMIN;
    if (set.has(UserRole.OPERATOR)) return UserRole.OPERATOR;
    if (set.has(UserRole.SUPPLIER_ADMIN)) return UserRole.SUPPLIER_ADMIN;
    if (set.has(UserRole.SUPPLIER_STAFF)) return UserRole.SUPPLIER_STAFF;
    if (set.has(UserRole.CUSTOMER)) return UserRole.CUSTOMER;
    return undefined;
  }
}
