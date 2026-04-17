import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationStatus,
  MessageType,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { AddConversationParticipantDto } from './dto/add-conversation-participant.dto';
import { SetConversationMuteDto } from './dto/set-conversation-mute.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveConversationOrderBy(
    query: ListConversationsDto,
  ): Prisma.ConversationOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'subject':
        return [{ subject: sortOrder }, { updatedAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      case 'updatedat':
        return [{ updatedAt: sortOrder }];
      case 'lastmessageat':
        return [{ lastMessageAt: sortOrder }, { updatedAt: 'desc' }];
      default:
        return [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }];
    }
  }

  private resolveMessageOrderBy(
    query: ListMessagesDto,
  ): Prisma.MessageOrderByWithRelationInput[] {
    const sortOrder: Prisma.SortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'editedat':
        return [{ editedAt: sortOrder }, { createdAt: 'desc' }];
      case 'createdat':
        return [{ createdAt: sortOrder }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async assertConversationAccess(actor: JwtPayload, conversationId: string) {
    await this.ensureCanAccessConversation(actor, conversationId);
    await this.ensureConversationExists(conversationId);
  }

  async listConversations(actor: JwtPayload, query: ListConversationsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const actorRoles = new Set(actor.roles);
    const canViewAll =
      actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR);
    const includeAll = query.includeAll && canViewAll;

    const participantConversationIds = includeAll
      ? undefined
      : await this.getParticipantConversationIds(actor.sub);

    if (
      !includeAll &&
      participantConversationIds &&
      !participantConversationIds.length
    ) {
      return { page, pageSize, total: 0, items: [] };
    }

    const where: Prisma.ConversationWhereInput = {
      type: query.type,
      status: query.status,
      bookingId: query.bookingId,
      supplierId: query.supplierId,
      ...(participantConversationIds
        ? {
            id: { in: participantConversationIds },
          }
        : {}),
      ...(query.q
        ? {
            subject: {
              contains: query.q,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.findMany({
        where,
        orderBy: this.resolveConversationOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const conversationIds = items.map((item) => item.id);
    const [participants, latestMessages, actorParticipants] = await Promise.all(
      [
        this.prisma.conversationParticipant.findMany({
          where: {
            conversationId: {
              in: conversationIds.length ? conversationIds : [''],
            },
          },
        }),
        this.getLatestMessages(conversationIds),
        this.prisma.conversationParticipant.findMany({
          where: {
            conversationId: {
              in: conversationIds.length ? conversationIds : [''],
            },
            userId: actor.sub,
          },
        }),
      ],
    );

    const actorParticipantByConversationId = new Map(
      actorParticipants.map((item) => [item.conversationId, item]),
    );

    const unreadCounts = await Promise.all(
      items.map(async (conversation) => {
        const actorParticipant = actorParticipantByConversationId.get(
          conversation.id,
        );
        if (!actorParticipant) {
          return [conversation.id, 0] as const;
        }

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            deletedAt: null,
            senderUserId: {
              not: actor.sub,
            },
            createdAt: actorParticipant.lastReadAt
              ? { gt: actorParticipant.lastReadAt }
              : undefined,
          },
        });

        return [conversation.id, unreadCount] as const;
      }),
    );

    const unreadByConversationId = new Map(unreadCounts);

    const resultItems = items.map((conversation) => ({
      ...conversation,
      participants: participants.filter(
        (item) => item.conversationId === conversation.id,
      ),
      latestMessage:
        latestMessages.find(
          (message) => message.conversationId === conversation.id,
        ) ?? null,
      unreadCount: unreadByConversationId.get(conversation.id) ?? 0,
    }));

    return { page, pageSize, total, items: resultItems };
  }

  async createConversation(actor: JwtPayload, dto: CreateConversationDto) {
    const participantUserIds = new Set([
      actor.sub,
      ...(dto.participantUserIds ?? []),
    ]);
    if (!participantUserIds.size) {
      throw new BadRequestException('At least one participant is required');
    }

    const participantIds = [...participantUserIds];
    await this.ensureUsersExist(participantIds);
    await this.ensureCanCreateConversation(actor, dto, participantIds);

    let supplierId = dto.supplierId;
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      supplierId = supplierId ?? booking.supplierId ?? undefined;
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          type: dto.type,
          subject: dto.subject,
          createdByUserId: actor.sub,
          bookingId: dto.bookingId,
          supplierId,
          metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
        },
      });

      const roleAssignments = await tx.userRoleAssignment.findMany({
        where: {
          userId: {
            in: participantIds,
          },
        },
        orderBy: [{ assignedAt: 'asc' }],
      });

      const roleByUserId = new Map<string, UserRole>();
      for (const item of roleAssignments) {
        if (!roleByUserId.has(item.userId)) {
          roleByUserId.set(item.userId, item.role);
        }
      }

      await tx.conversationParticipant.createMany({
        data: participantIds.map((userId) => ({
          conversationId: created.id,
          userId,
          participantRole: roleByUserId.get(userId),
        })),
      });

      return this.getConversationById(actor, created.id);
    });
  }

  async getUnreadSummary(actor: JwtPayload) {
    const participantRows = await this.prisma.conversationParticipant.findMany({
      where: { userId: actor.sub },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    if (!participantRows.length) {
      return { unreadConversations: 0, unreadMessages: 0 };
    }

    const unreadPerConversation = await Promise.all(
      participantRows.map(async (item) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: item.conversationId,
            deletedAt: null,
            senderUserId: { not: actor.sub },
            createdAt: item.lastReadAt ? { gt: item.lastReadAt } : undefined,
          },
        });

        return unreadCount;
      }),
    );

    const unreadConversations = unreadPerConversation.filter(
      (count) => count > 0,
    ).length;
    const unreadMessages = unreadPerConversation.reduce(
      (sum, count) => sum + count,
      0,
    );

    return { unreadConversations, unreadMessages };
  }

  async getConversationById(actor: JwtPayload, conversationId: string) {
    await this.ensureCanAccessConversation(actor, conversationId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const [participants, latestMessages] = await Promise.all([
      this.prisma.conversationParticipant.findMany({
        where: { conversationId },
        orderBy: [{ joinedAt: 'asc' }],
      }),
      this.prisma.message.findMany({
        where: {
          conversationId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
      }),
    ]);

    return {
      ...conversation,
      participants,
      latestMessages: latestMessages.reverse(),
    };
  }

  async updateConversationStatus(
    actor: JwtPayload,
    conversationId: string,
    dto: UpdateConversationStatusDto,
  ) {
    await this.ensureCanAccessConversation(actor, conversationId);
    const conversation = await this.ensureConversationExists(conversationId);

    if (
      conversation.status === ConversationStatus.CLOSED ||
      conversation.status === ConversationStatus.SPAM
    ) {
      const actorRoles = new Set(actor.roles);
      if (
        !actorRoles.has(UserRole.ADMIN) &&
        !actorRoles.has(UserRole.OPERATOR)
      ) {
        throw new ForbiddenException(
          'Only admin/operator can reopen closed or spam conversations',
        );
      }
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: dto.status,
      },
    });
  }

  async addParticipant(
    actor: JwtPayload,
    conversationId: string,
    dto: AddConversationParticipantDto,
  ) {
    await this.ensureCanManageConversationParticipants(actor, conversationId);
    await this.ensureUsersExist([dto.userId]);

    const existing = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const firstRole = await this.prisma.userRoleAssignment.findFirst({
      where: { userId: dto.userId },
      orderBy: [{ assignedAt: 'asc' }],
    });

    return this.prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId: dto.userId,
        participantRole: firstRole?.role,
      },
    });
  }

  async removeParticipant(
    actor: JwtPayload,
    conversationId: string,
    userId: string,
  ) {
    await this.ensureCanManageConversationParticipants(actor, conversationId);

    const participantCount = await this.prisma.conversationParticipant.count({
      where: { conversationId },
    });

    const existing = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Participant not found');
    }

    if (participantCount <= 1) {
      throw new BadRequestException(
        'Conversation must have at least one participant',
      );
    }

    await this.prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    return { message: 'Participant removed' };
  }

  async setConversationMute(
    actor: JwtPayload,
    conversationId: string,
    dto: SetConversationMuteDto,
  ) {
    await this.ensureCanAccessConversation(actor, conversationId);

    const updated = await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: actor.sub,
        },
      },
      data: {
        muted: dto.muted,
      },
    });

    return updated;
  }

  async markConversationRead(actor: JwtPayload, conversationId: string) {
    await this.ensureCanAccessConversation(actor, conversationId);

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: actor.sub,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return { message: 'Conversation marked as read' };
  }

  async listMessages(
    actor: JwtPayload,
    conversationId: string,
    query: ListMessagesDto,
  ) {
    await this.ensureCanAccessConversation(actor, conversationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;

    const where: Prisma.MessageWhereInput = {
      conversationId,
      ...(query.q
        ? {
            body: { contains: query.q, mode: 'insensitive' },
          }
        : {}),
    };

    const messageOrderBy = this.resolveMessageOrderBy(query);
    const isDescendingCreatedAt =
      messageOrderBy[0] &&
      'createdAt' in messageOrderBy[0] &&
      messageOrderBy[0].createdAt === 'desc';

    const [total, rows] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        orderBy: messageOrderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const messageIds = rows.map((item) => item.id);
    const attachments = await this.prisma.messageAttachment.findMany({
      where: {
        messageId: {
          in: messageIds.length ? messageIds : [''],
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    const normalizedRows = isDescendingCreatedAt ? rows.reverse() : rows;

    const items = normalizedRows.map((item) => ({
      ...item,
      attachments: attachments.filter(
        (attachment) => attachment.messageId === item.id,
      ),
    }));

    return { page, pageSize, total, items };
  }

  async sendMessage(
    actor: JwtPayload,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    await this.ensureCanAccessConversation(actor, conversationId);
    await this.ensureConversationExists(conversationId);

    const messageType = dto.messageType ?? MessageType.TEXT;
    const body = dto.body?.trim();
    const attachments = dto.attachments ?? [];

    if (!body && !attachments.length) {
      throw new BadRequestException('Message body or attachments are required');
    }

    if (messageType === MessageType.TEXT && !body && !attachments.length) {
      throw new BadRequestException('Text message body is required');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderUserId: actor.sub,
          messageType,
          body,
          metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
        },
      });

      if (attachments.length) {
        await tx.messageAttachment.createMany({
          data: attachments.map((item) => ({
            messageId: message.id,
            fileUrl: item.fileUrl,
            fileName: item.fileName,
            mimeType: item.mimeType,
            fileSizeBytes:
              item.fileSizeBytes !== undefined
                ? BigInt(item.fileSizeBytes)
                : undefined,
          })),
        });
      }

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: message.createdAt,
        },
      });

      return message;
    });

    const fullMessage = await this.getMessageById(created.id);

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: actor.sub,
      },
      data: {
        lastReadAt: created.createdAt,
      },
    });

    return fullMessage;
  }

  async editMessage(actor: JwtPayload, messageId: string, dto: EditMessageDto) {
    const message = await this.ensureMessageExists(messageId);
    await this.ensureCanAccessConversation(actor, message.conversationId);

    const actorRoles = new Set(actor.roles);
    const canModerate =
      actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR);
    if (!canModerate && message.senderUserId !== actor.sub) {
      throw new ForbiddenException('Only sender can edit this message');
    }

    if (!dto.body?.trim()) {
      throw new BadRequestException('Message body is required');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        body: dto.body.trim(),
        editedAt: new Date(),
      },
    });
  }

  async deleteMessage(actor: JwtPayload, messageId: string) {
    const message = await this.ensureMessageExists(messageId);
    await this.ensureCanAccessConversation(actor, message.conversationId);

    const actorRoles = new Set(actor.roles);
    const canModerate =
      actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR);
    if (!canModerate && message.senderUserId !== actor.sub) {
      throw new ForbiddenException('Only sender can delete this message');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        body: null,
        deletedAt: new Date(),
      },
    });

    return { message: 'Message deleted' };
  }

  private async getLatestMessages(conversationIds: string[]) {
    if (!conversationIds.length) {
      return [];
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: {
          in: conversationIds,
        },
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const seen = new Set<string>();
    const latest: typeof messages = [];
    for (const item of messages) {
      if (seen.has(item.conversationId)) {
        continue;
      }
      seen.add(item.conversationId);
      latest.push(item);
    }

    return latest;
  }

  private async getParticipantConversationIds(userId: string) {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return rows.map((item) => item.conversationId);
  }

  private async ensureCanCreateConversation(
    actor: JwtPayload,
    dto: CreateConversationDto,
    participantIds: string[],
  ) {
    const roles = new Set(actor.roles);
    const canModerate =
      roles.has(UserRole.ADMIN) || roles.has(UserRole.OPERATOR);

    if (canModerate) {
      return;
    }

    if (!participantIds.includes(actor.sub)) {
      throw new ForbiddenException('Creator must be a participant');
    }

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== actor.sub) {
        const isSupplierStaff =
          roles.has(UserRole.SUPPLIER_ADMIN) ||
          roles.has(UserRole.SUPPLIER_STAFF);
        if (!isSupplierStaff || !booking.supplierId) {
          throw new ForbiddenException(
            'You cannot create conversation for this booking',
          );
        }

        const membership = await this.prisma.supplierUser.findFirst({
          where: {
            userId: actor.sub,
            supplierId: booking.supplierId,
          },
        });

        if (!membership) {
          throw new ForbiddenException(
            'You cannot create conversation for this booking',
          );
        }
      }
    }

    if (participantIds.length > 2 && !canModerate) {
      throw new ForbiddenException(
        'Only admin/operator can create group conversations',
      );
    }
  }

  private async ensureCanManageConversationParticipants(
    actor: JwtPayload,
    conversationId: string,
  ) {
    const roles = new Set(actor.roles);
    if (roles.has(UserRole.ADMIN) || roles.has(UserRole.OPERATOR)) {
      return;
    }

    const conversation = await this.ensureConversationExists(conversationId);
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: actor.sub,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    if (conversation.createdByUserId !== actor.sub) {
      throw new ForbiddenException(
        'Only conversation creator or admin/operator can manage participants',
      );
    }
  }

  private async ensureCanAccessConversation(
    actor: JwtPayload,
    conversationId: string,
  ) {
    const actorRoles = new Set(actor.roles);
    if (actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR)) {
      return;
    }

    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: actor.sub,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }
  }

  private async ensureConversationExists(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private async ensureMessageExists(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  private async getMessageById(messageId: string) {
    const message = await this.ensureMessageExists(messageId);
    const attachments = await this.prisma.messageAttachment.findMany({
      where: { messageId },
      orderBy: [{ createdAt: 'asc' }],
    });

    return {
      ...message,
      attachments,
    };
  }

  private async ensureUsersExist(userIds: string[]) {
    const count = await this.prisma.user.count({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    if (count !== userIds.length) {
      throw new BadRequestException(
        'One or more participant users were not found',
      );
    }
  }
}
