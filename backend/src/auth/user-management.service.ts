import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminResetUserPasswordDto } from './dto/admin-reset-user-password.dto';
import { BulkUserLifecycleActionDto } from './dto/bulk-user-lifecycle-action.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserLifecycleActionDto } from './dto/user-lifecycle-action.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

type UserWithRoles = User & { roles: Array<{ role: UserRole }> };

@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async listUsers(actor: JwtPayload, query: ListUsersDto) {
    const actorRoleLevel = this.resolveActorRoleLevel(new Set(actor.roles));
    if (actorRoleLevel === 'NONE') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    let supplierStaffUserIds: string[] | null = null;
    if (actorRoleLevel === 'SUPPLIER_ADMIN') {
      supplierStaffUserIds = await this.getSupplierStaffIdsManageableBySupplierAdmin(actor.sub);
      if (!supplierStaffUserIds.length) {
        return { page, pageSize, total: 0, items: [] };
      }
    }

    const where: Prisma.UserWhereInput = {
      status: query.status,
      deletedAt: query.includeDeleted ? undefined : null,
      ...(query.role
        ? { roles: { some: { role: query.role } } }
        : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' } },
              { firstName: { contains: query.q, mode: 'insensitive' } },
              { lastName: { contains: query.q, mode: 'insensitive' } },
              { phoneE164: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(supplierStaffUserIds ? { id: { in: supplierStaffUserIds } } : {}),
    };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { roles: true },
        orderBy: this.resolveUsersOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: users.map((user) => this.toPublicUser(user)),
    };
  }

  async getUserById(actor: JwtPayload, userId: string) {
    const actorRoleLevel = this.resolveActorRoleLevel(new Set(actor.roles));
    if (actorRoleLevel === 'NONE') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (actorRoleLevel === 'SUPPLIER_ADMIN') {
      const supplierStaffIds = await this.getSupplierStaffIdsManageableBySupplierAdmin(actor.sub);
      if (!supplierStaffIds.includes(userId)) {
        throw new ForbiddenException('Supplier admin can only view supplier staff');
      }
    }

    return this.toPublicUser(user);
  }

  async createUser(actor: JwtPayload, dto: CreateUserDto) {
    const actorRoles = new Set(actor.roles);
    const actorRoleLevel = this.resolveActorRoleLevel(actorRoles);
    if (actorRoleLevel === 'NONE') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ForbiddenException('Email already exists');
    }

    const roles = this.resolveCreateRoles(actorRoleLevel, dto.roles);
    const supplierIds = await this.resolveSupplierIdsForCreate(
      actorRoleLevel, actor.sub, roles, dto.supplierIds,
    );

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const status = dto.status ?? (actorRoleLevel === 'SUPPLIER_ADMIN' ? 'ACTIVE' : 'PENDING');

    const createdUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, firstName: dto.firstName, lastName: dto.lastName, phoneE164: dto.phoneE164, status },
      });

      await tx.userRoleAssignment.createMany({
        data: roles.map((role) => ({ userId: user.id, role })),
      });

      const supplierRoles = roles.filter((role) => role === 'SUPPLIER_ADMIN' || role === 'SUPPLIER_STAFF');
      if (supplierRoles.length && supplierIds.length) {
        await tx.supplierUser.createMany({
          data: supplierIds.flatMap((supplierId) =>
            supplierRoles.map((role) => ({ supplierId, userId: user.id, role })),
          ),
        });
      }

      const withRoles = await tx.user.findUnique({ where: { id: user.id }, include: { roles: true } });
      if (!withRoles) throw new NotFoundException('User not found');
      return withRoles;
    });

    await this.auditLogsService.createAuditLog({
      actorUserId: actor.sub,
      actorRole: this.resolveActorRoleForAudit(actorRoles),
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: createdUser.id,
      changes: { email: createdUser.email, status: createdUser.status, roles, supplierIds },
    });

    return this.toPublicUser(createdUser);
  }

  async updateUserById(actor: JwtPayload, userId: string, dto: UpdateUserDto) {
    const actorRoles = new Set(actor.roles);
    if (actorRoles.size === 0) throw new ForbiddenException('Insufficient permissions');

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!targetUser) throw new NotFoundException('User not found');

    const targetRoles = new Set(targetUser.roles.map((item) => item.role));
    const actorRoleLevel = this.resolveActorRoleLevel(actorRoles);
    if (actorRoleLevel === 'NONE') throw new ForbiddenException('Insufficient permissions');

    if (actor.sub === userId) throw new BadRequestException('Use /auth/me to update your own profile');
    if (actorRoleLevel === 'OPERATOR' && targetRoles.has('ADMIN')) throw new ForbiddenException('Operator cannot update admin user');
    if (actorRoleLevel === 'SUPPLIER_ADMIN' && !targetRoles.has('SUPPLIER_STAFF')) throw new ForbiddenException('Supplier admin can only update supplier staff');

    const allowedFields = this.getAllowedUpdateFieldsByRoleLevel(actorRoleLevel);
    if (this.hasRestrictedUpdateInput(dto, allowedFields)) {
      throw new ForbiddenException('Some fields are not allowed for your role');
    }

    if (actorRoleLevel === 'SUPPLIER_ADMIN' && dto.status && !['ACTIVE', 'SUSPENDED'].includes(dto.status)) {
      throw new ForbiddenException('Supplier admin can only set ACTIVE or SUSPENDED status');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { firstName: dto.firstName, lastName: dto.lastName, phoneE164: dto.phoneE164, status: dto.status },
      });

      if (dto.roles && dto.roles.length > 0) {
        if (actorRoleLevel !== 'ADMIN') throw new ForbiddenException('Only admin can change user roles');
        if (dto.roles.includes('ADMIN') && actorRoleLevel !== 'ADMIN') throw new ForbiddenException('Only admin can assign admin role');

        await tx.userRoleAssignment.deleteMany({ where: { userId } });
        await tx.userRoleAssignment.createMany({ data: dto.roles.map((role) => ({ userId, role })) });
      }
    });

    await this.auditLogsService.createAuditLog({
      actorUserId: actor.sub,
      actorRole: this.resolveActorRoleForAudit(actorRoles),
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: userId,
      changes: { firstName: dto.firstName, lastName: dto.lastName, phoneE164: dto.phoneE164, status: dto.status, roles: dto.roles },
    });

    return this.getUserPublic(userId);
  }

  async lockUserById(actor: JwtPayload, userId: string, dto: UserLifecycleActionDto) {
    return this.applyUserLifecycleAction(actor, userId, dto, {
      nextStatus: 'SUSPENDED', nextDeletedAt: null, allowedCurrentStatuses: ['ACTIVE', 'PENDING'],
      requireDeletedAt: false, action: 'USER_LOCKED', revokeSessions: true,
    });
  }

  async unlockUserById(actor: JwtPayload, userId: string, dto: UserLifecycleActionDto) {
    return this.applyUserLifecycleAction(actor, userId, dto, {
      nextStatus: 'ACTIVE', nextDeletedAt: null, allowedCurrentStatuses: ['SUSPENDED'],
      requireDeletedAt: false, action: 'USER_UNLOCKED', revokeSessions: false,
    });
  }

  async softDeleteUserById(actor: JwtPayload, userId: string, dto: UserLifecycleActionDto) {
    return this.applyUserLifecycleAction(actor, userId, dto, {
      nextStatus: 'DELETED', nextDeletedAt: new Date(), allowedCurrentStatuses: ['PENDING', 'ACTIVE', 'SUSPENDED'],
      requireDeletedAt: false, action: 'USER_SOFT_DELETED', revokeSessions: true,
    });
  }

  async restoreUserById(actor: JwtPayload, userId: string, dto: UserLifecycleActionDto) {
    return this.applyUserLifecycleAction(actor, userId, dto, {
      nextStatus: 'ACTIVE', nextDeletedAt: null, allowedCurrentStatuses: ['DELETED'],
      requireDeletedAt: true, action: 'USER_RESTORED', revokeSessions: false,
    });
  }

  async lockUsersBulk(actor: JwtPayload, dto: BulkUserLifecycleActionDto) {
    return this.applyBulkLifecycleAction(actor, dto, {
      nextStatus: 'SUSPENDED', nextDeletedAt: null, allowedCurrentStatuses: ['ACTIVE', 'PENDING'],
      requireDeletedAt: false, action: 'USER_LOCKED', revokeSessions: true, bulkAction: 'USER_BULK_LOCKED',
    });
  }

  async unlockUsersBulk(actor: JwtPayload, dto: BulkUserLifecycleActionDto) {
    return this.applyBulkLifecycleAction(actor, dto, {
      nextStatus: 'ACTIVE', nextDeletedAt: null, allowedCurrentStatuses: ['SUSPENDED'],
      requireDeletedAt: false, action: 'USER_UNLOCKED', revokeSessions: false, bulkAction: 'USER_BULK_UNLOCKED',
    });
  }

  async softDeleteUsersBulk(actor: JwtPayload, dto: BulkUserLifecycleActionDto) {
    return this.applyBulkLifecycleAction(actor, dto, {
      nextStatus: 'DELETED', nextDeletedAt: new Date(), allowedCurrentStatuses: ['PENDING', 'ACTIVE', 'SUSPENDED'],
      requireDeletedAt: false, action: 'USER_SOFT_DELETED', revokeSessions: true, bulkAction: 'USER_BULK_SOFT_DELETED',
    });
  }

  async restoreUsersBulk(actor: JwtPayload, dto: BulkUserLifecycleActionDto) {
    return this.applyBulkLifecycleAction(actor, dto, {
      nextStatus: 'ACTIVE', nextDeletedAt: null, allowedCurrentStatuses: ['DELETED'],
      requireDeletedAt: true, action: 'USER_RESTORED', revokeSessions: false, bulkAction: 'USER_BULK_RESTORED',
    });
  }

  async resetUserPasswordByAdmin(actor: JwtPayload, userId: string, dto: AdminResetUserPasswordDto) {
    const actorRoles = new Set(actor.roles);
    const actorRoleLevel = this.resolveActorRoleLevel(actorRoles);
    if (actorRoleLevel === 'NONE') throw new ForbiddenException('Insufficient permissions');

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!targetUser) throw new NotFoundException('User not found');
    if (actor.sub === userId) throw new BadRequestException('Use /auth/change-password for your own account');

    await this.assertCanManageTargetUser(actorRoleLevel, actor.sub, targetUser);

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    await this.auditLogsService.createAuditLog({
      actorUserId: actor.sub,
      actorRole: this.resolveActorRoleForAudit(actorRoles),
      action: 'USER_PASSWORD_RESET_BY_ADMIN',
      entityType: 'USER',
      entityId: userId,
      changes: { reason: dto.reason },
    });

    return { message: 'User password has been reset and active sessions were revoked' };
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async getUserPublic(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toPublicUser(user);
  }

  private async applyUserLifecycleAction(
    actor: JwtPayload,
    userId: string,
    dto: UserLifecycleActionDto,
    options: {
      nextStatus: UserStatus; nextDeletedAt: Date | null; allowedCurrentStatuses: UserStatus[];
      requireDeletedAt: boolean; action: string; revokeSessions: boolean;
    },
  ) {
    const actorRoles = new Set(actor.roles);
    const actorRoleLevel = this.resolveActorRoleLevel(actorRoles);
    if (actorRoleLevel === 'NONE') throw new ForbiddenException('Insufficient permissions');

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!targetUser) throw new NotFoundException('User not found');
    if (actor.sub === userId) throw new BadRequestException('Cannot perform this action on your own account');

    await this.assertCanManageTargetUser(actorRoleLevel, actor.sub, targetUser);

    if (!options.allowedCurrentStatuses.includes(targetUser.status)) {
      throw new BadRequestException(`Invalid current status for this action: ${targetUser.status}`);
    }
    if (options.requireDeletedAt && !targetUser.deletedAt) throw new BadRequestException('User is not deleted');
    if (!options.requireDeletedAt && targetUser.deletedAt && options.nextStatus !== 'DELETED') {
      throw new BadRequestException('User is deleted, restore first');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status: options.nextStatus, deletedAt: options.nextDeletedAt } });
      if (options.revokeSessions) {
        await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      const reloaded = await tx.user.findUnique({ where: { id: userId }, include: { roles: true } });
      if (!reloaded) throw new NotFoundException('User not found');
      return reloaded;
    });

    await this.auditLogsService.createAuditLog({
      actorUserId: actor.sub,
      actorRole: this.resolveActorRoleForAudit(actorRoles),
      action: options.action,
      entityType: 'USER',
      entityId: userId,
      changes: { reason: dto.reason, fromStatus: targetUser.status, toStatus: updatedUser.status },
    });

    return this.toPublicUser(updatedUser);
  }

  private async applyBulkLifecycleAction(
    actor: JwtPayload,
    dto: BulkUserLifecycleActionDto,
    options: {
      nextStatus: UserStatus; nextDeletedAt: Date | null; allowedCurrentStatuses: UserStatus[];
      requireDeletedAt: boolean; action: string; revokeSessions: boolean; bulkAction: string;
    },
  ) {
    const actorRoles = new Set(actor.roles);
    const actorRoleLevel = this.resolveActorRoleLevel(actorRoles);
    if (actorRoleLevel === 'NONE') throw new ForbiddenException('Insufficient permissions');

    const results: Array<{ userId: string; status: 'ok' | 'failed'; message?: string }> = [];

    for (const userId of dto.userIds) {
      try {
        if (userId === actor.sub) throw new BadRequestException('Cannot perform this action on your own account');

        const targetUser = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
        if (!targetUser) throw new NotFoundException('User not found');

        await this.assertCanManageTargetUser(actorRoleLevel, actor.sub, targetUser);

        if (!options.allowedCurrentStatuses.includes(targetUser.status)) {
          throw new BadRequestException(`Invalid current status for this action: ${targetUser.status}`);
        }
        if (options.requireDeletedAt && !targetUser.deletedAt) throw new BadRequestException('User is not deleted');
        if (!options.requireDeletedAt && targetUser.deletedAt && options.nextStatus !== 'DELETED') {
          throw new BadRequestException('User is deleted, restore first');
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: userId }, data: { status: options.nextStatus, deletedAt: options.nextDeletedAt } });
          if (options.revokeSessions) {
            await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
          }
        });

        await this.auditLogsService.createAuditLog({
          actorUserId: actor.sub,
          actorRole: this.resolveActorRoleForAudit(actorRoles),
          action: options.action,
          entityType: 'USER',
          entityId: userId,
          changes: { reason: dto.reason, fromStatus: targetUser.status, toStatus: options.nextStatus },
        });

        results.push({ userId, status: 'ok' });
      } catch (error) {
        const message = error instanceof Error && error.message ? error.message : 'Unexpected error while processing user';
        results.push({ userId, status: 'failed', message });
      }
    }

    const successCount = results.filter((item) => item.status === 'ok').length;
    const failedCount = results.length - successCount;

    await this.auditLogsService.createAuditLog({
      actorUserId: actor.sub,
      actorRole: this.resolveActorRoleForAudit(actorRoles),
      action: options.bulkAction,
      entityType: 'USER',
      changes: { reason: dto.reason, total: results.length, successCount, failedCount, userIds: dto.userIds },
    });

    return { total: results.length, successCount, failedCount, results };
  }

  private async assertCanManageTargetUser(
    actorRoleLevel: 'ADMIN' | 'OPERATOR' | 'SUPPLIER_ADMIN' | 'NONE',
    actorUserId: string,
    targetUser: UserWithRoles,
  ) {
    const targetRoles = new Set(targetUser.roles.map((item) => item.role));
    if (actorRoleLevel === 'OPERATOR' && targetRoles.has('ADMIN')) {
      throw new ForbiddenException('Operator cannot manage admin user');
    }
    if (actorRoleLevel === 'SUPPLIER_ADMIN') {
      if (!targetRoles.has('SUPPLIER_STAFF')) throw new ForbiddenException('Supplier admin can only manage supplier staff');
      const supplierStaffIds = await this.getSupplierStaffIdsManageableBySupplierAdmin(actorUserId);
      if (!supplierStaffIds.includes(targetUser.id)) throw new ForbiddenException('Supplier admin cannot manage this user');
    }
  }

  private resolveActorRoleForAudit(actorRoles: Set<UserRole>): UserRole | undefined {
    const priority: UserRole[] = ['ADMIN', 'OPERATOR', 'SUPPLIER_ADMIN', 'SUPPLIER_STAFF', 'CUSTOMER'];
    return priority.find((role) => actorRoles.has(role));
  }

  private async getManagedSupplierIdsBySupplierAdmin(userId: string) {
    const rows = await this.prisma.supplierUser.findMany({
      where: { userId, role: 'SUPPLIER_ADMIN' },
      select: { supplierId: true },
    });
    return [...new Set(rows.map((item) => item.supplierId))];
  }

  private async getSupplierStaffIdsManageableBySupplierAdmin(userId: string) {
    const managedSupplierIds = await this.getManagedSupplierIdsBySupplierAdmin(userId);
    if (!managedSupplierIds.length) return [];
    const rows = await this.prisma.supplierUser.findMany({
      where: { supplierId: { in: managedSupplierIds }, role: 'SUPPLIER_STAFF' },
      select: { userId: true },
    });
    return [...new Set(rows.map((item) => item.userId))];
  }

  toPublicUser(user: UserWithRoles) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneE164: user.phoneE164,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map((item) => item.role),
    };
  }

  private resolveActorRoleLevel(actorRoles: Set<UserRole>) {
    if (actorRoles.has('ADMIN')) return 'ADMIN' as const;
    if (actorRoles.has('OPERATOR')) return 'OPERATOR' as const;
    if (actorRoles.has('SUPPLIER_ADMIN')) return 'SUPPLIER_ADMIN' as const;
    return 'NONE' as const;
  }

  private resolveUsersOrderBy(query: ListUsersDto): Prisma.UserOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'email': return [{ email: sortOrder }, { createdAt: 'desc' }];
      case 'status': return [{ status: sortOrder }, { createdAt: 'desc' }];
      case 'lastloginat': return [{ lastLoginAt: sortOrder }, { createdAt: 'desc' }];
      case 'updatedat': return [{ updatedAt: sortOrder }];
      case 'createdat': return [{ createdAt: sortOrder }];
      default: return [{ createdAt: 'desc' }];
    }
  }

  private resolveCreateRoles(actorRoleLevel: 'ADMIN' | 'OPERATOR' | 'SUPPLIER_ADMIN' | 'NONE', requestedRoles?: UserRole[]) {
    const deduped = requestedRoles ? [...new Set(requestedRoles)] : [];
    if (deduped.length === 0) {
      return actorRoleLevel === 'SUPPLIER_ADMIN' ? ['SUPPLIER_STAFF'] as UserRole[] : ['CUSTOMER'] as UserRole[];
    }
    const allowedRolesByLevel: Record<'ADMIN' | 'OPERATOR' | 'SUPPLIER_ADMIN' | 'NONE', UserRole[]> = {
      ADMIN: ['CUSTOMER', 'SUPPLIER_ADMIN', 'SUPPLIER_STAFF', 'OPERATOR', 'ADMIN'],
      OPERATOR: ['CUSTOMER', 'SUPPLIER_STAFF', 'SUPPLIER_ADMIN'],
      SUPPLIER_ADMIN: ['SUPPLIER_STAFF'],
      NONE: [],
    };
    const allowed = new Set(allowedRolesByLevel[actorRoleLevel]);
    if (deduped.some((role) => !allowed.has(role))) {
      throw new ForbiddenException('Some roles are not allowed for your account');
    }
    return deduped;
  }

  private async resolveSupplierIdsForCreate(
    actorRoleLevel: 'ADMIN' | 'OPERATOR' | 'SUPPLIER_ADMIN' | 'NONE',
    actorUserId: string,
    roles: UserRole[],
    requestedSupplierIds?: string[],
  ) {
    const hasSupplierRole = roles.some((role) => role === 'SUPPLIER_ADMIN' || role === 'SUPPLIER_STAFF');
    if (!hasSupplierRole) return [];

    const dedupedRequested = requestedSupplierIds
      ? [...new Set(requestedSupplierIds.map((id) => id.trim()))].filter(Boolean)
      : [];

    if (actorRoleLevel === 'SUPPLIER_ADMIN') {
      const manageableSupplierIds = await this.getManagedSupplierIdsBySupplierAdmin(actorUserId);
      if (!manageableSupplierIds.length) throw new ForbiddenException('Supplier admin has no manageable suppliers');
      if (!dedupedRequested.length) return manageableSupplierIds;
      const manageableSet = new Set(manageableSupplierIds);
      const allowedSupplierIds = dedupedRequested.filter((id) => manageableSet.has(id));
      if (!allowedSupplierIds.length) throw new ForbiddenException('No supplierIds are manageable by your account');
      return allowedSupplierIds;
    }

    if (!dedupedRequested.length) throw new BadRequestException('supplierIds is required when assigning supplier roles');
    return dedupedRequested;
  }

  private getAllowedUpdateFieldsByRoleLevel(roleLevel: 'ADMIN' | 'OPERATOR' | 'SUPPLIER_ADMIN' | 'NONE') {
    if (roleLevel === 'ADMIN') return new Set(['firstName', 'lastName', 'phoneE164', 'status', 'roles']);
    if (roleLevel === 'OPERATOR') return new Set(['firstName', 'lastName', 'phoneE164', 'status']);
    if (roleLevel === 'SUPPLIER_ADMIN') return new Set(['firstName', 'lastName', 'phoneE164', 'status']);
    return new Set<string>();
  }

  private hasRestrictedUpdateInput(dto: UpdateUserDto, allowedFields: Set<string>): boolean {
    const checks: Array<[string, unknown]> = [
      ['firstName', dto.firstName], ['lastName', dto.lastName], ['phoneE164', dto.phoneE164],
      ['status', dto.status], ['roles', dto.roles],
    ];
    return checks.some(([field, value]) => value !== undefined && !allowedFields.has(field));
  }
}
