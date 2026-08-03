import {
  Body,
  Controller,
  Delete,
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
import { AddConversationParticipantDto } from './dto/add-conversation-participant.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SetConversationMuteDto } from './dto/set-conversation-mute.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  listConversations(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListConversationsDto,
  ) {
    return this.messagesService.listConversations(actor, query);
  }

  @Get('conversations/unread-summary')
  getUnreadSummary(@CurrentUser() actor: JwtPayload) {
    return this.messagesService.getUnreadSummary(actor);
  }

  @Post('conversations')
  createConversation(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagesService.createConversation(actor, dto);
  }

  @Get('conversations/:id')
  getConversationById(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.messagesService.getConversationById(actor, id);
  }

  @Patch('conversations/:id/status')
  updateConversationStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.messagesService.updateConversationStatus(actor, id, dto);
  }

  @Post('conversations/:id/participants')
  addParticipant(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddConversationParticipantDto,
  ) {
    return this.messagesService.addParticipant(actor, id, dto);
  }

  @Delete('conversations/:id/participants/:userId')
  removeParticipant(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.messagesService.removeParticipant(actor, id, userId);
  }

  @Patch('conversations/:id/mute')
  setConversationMute(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetConversationMuteDto,
  ) {
    return this.messagesService.setConversationMute(actor, id, dto);
  }

  @Post('conversations/:id/read')
  markConversationRead(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.messagesService.markConversationRead(actor, id);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.messagesService.listMessages(actor, id, query);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(actor, id, dto);
  }

  @Patch('items/:id')
  editMessage(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messagesService.editMessage(actor, id, dto);
  }

  @Delete('items/:id')
  deleteMessage(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.messagesService.deleteMessage(actor, id);
  }
}
