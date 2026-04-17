import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MessagesService } from './messages.service';

type SocketWithUser = Socket;

@WebSocketGateway({
  namespace: 'messages',
  cors: {
    origin: '*',
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: SocketWithUser) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
      });

      this.setSocketUser(client, payload);
      this.logger.debug(`Client connected: ${client.id} user=${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: SocketWithUser) {
    const userId = this.getSocketUser(client)?.sub ?? 'unknown';
    this.logger.debug(`Client disconnected: ${client.id} user=${userId}`);
  }

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const actor = this.requireSocketUser(client);
    const conversationId = payload.conversationId;
    if (!conversationId) {
      return { ok: false, message: 'conversationId is required' };
    }

    await this.messagesService.assertConversationAccess(actor, conversationId);

    await client.join(this.roomName(conversationId));
    return { ok: true, conversationId };
  }

  @SubscribeMessage('conversation.leave')
  async leaveConversation(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const conversationId = payload.conversationId;
    if (!conversationId) {
      return { ok: false, message: 'conversationId is required' };
    }

    await client.leave(this.roomName(conversationId));
    return { ok: true, conversationId };
  }

  @SubscribeMessage('message.send')
  async sendMessage(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody()
    payload: {
      conversationId?: string;
      body?: string;
      messageType?: 'TEXT' | 'SYSTEM' | 'IMAGE' | 'FILE';
      metadata?: Record<string, unknown>;
      attachments?: Array<{
        fileUrl: string;
        fileName?: string;
        mimeType?: string;
        fileSizeBytes?: number;
      }>;
    },
  ) {
    const actor = this.requireSocketUser(client);
    const conversationId = payload.conversationId;
    if (!conversationId) {
      return { ok: false, message: 'conversationId is required' };
    }

    const message = await this.messagesService.sendMessage(
      actor,
      conversationId,
      {
        body: payload.body,
        messageType: payload.messageType,
        metadata: payload.metadata,
        attachments: payload.attachments,
      },
    );

    this.server.to(this.roomName(conversationId)).emit('message.created', {
      conversationId,
      message,
    });

    return { ok: true, message };
  }

  @SubscribeMessage('conversation.read')
  async markConversationRead(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const actor = this.requireSocketUser(client);
    const conversationId = payload.conversationId;
    if (!conversationId) {
      return { ok: false, message: 'conversationId is required' };
    }

    const result = await this.messagesService.markConversationRead(
      actor,
      conversationId,
    );
    const summary = await this.messagesService.getUnreadSummary(actor);

    this.server
      .to(this.roomName(conversationId))
      .emit('conversation.read.updated', {
        conversationId,
        userId: actor.sub,
        readAt: new Date().toISOString(),
      });

    return { ok: true, result, summary };
  }

  @SubscribeMessage('typing')
  async typing(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId?: string; isTyping?: boolean },
  ) {
    const actor = this.requireSocketUser(client);
    const conversationId = payload.conversationId;
    if (!conversationId) {
      return { ok: false, message: 'conversationId is required' };
    }

    await this.messagesService.assertConversationAccess(actor, conversationId);

    client.to(this.roomName(conversationId)).emit('typing', {
      conversationId,
      userId: actor.sub,
      isTyping: payload.isTyping === true,
    });

    return { ok: true };
  }

  private requireSocketUser(client: SocketWithUser): JwtPayload {
    const actor = this.getSocketUser(client);
    if (!actor) {
      throw new Error('Unauthorized socket');
    }
    return actor;
  }

  private roomName(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  private extractToken(client: SocketWithUser) {
    const rawAuth: unknown = client.handshake.auth;
    const authToken =
      rawAuth && typeof rawAuth === 'object'
        ? (rawAuth as Record<string, unknown>).token
        : undefined;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const rawAuthorizationHeader: unknown =
      client.handshake.headers.authorization;
    const authorization = Array.isArray(rawAuthorizationHeader)
      ? (rawAuthorizationHeader as unknown[]).find(
          (value): value is string => typeof value === 'string',
        )
      : rawAuthorizationHeader;
    if (
      typeof authorization === 'string' &&
      authorization.startsWith('Bearer ')
    ) {
      return authorization.slice(7);
    }

    return undefined;
  }

  private setSocketUser(client: SocketWithUser, payload: JwtPayload): void {
    const rawData: unknown = client.data;
    if (!rawData || typeof rawData !== 'object') {
      return;
    }

    (rawData as Record<string, unknown>).user = payload;
  }

  private getSocketUser(client: SocketWithUser): JwtPayload | undefined {
    const rawData: unknown = client.data;
    if (!rawData || typeof rawData !== 'object') {
      return undefined;
    }

    const rawUser = (rawData as Record<string, unknown>).user;
    if (!this.isJwtPayload(rawUser)) {
      return undefined;
    }

    return rawUser;
  }

  private isJwtPayload(value: unknown): value is JwtPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payload = value as Record<string, unknown>;
    return (
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string' &&
      Array.isArray(payload.roles)
    );
  }
}
