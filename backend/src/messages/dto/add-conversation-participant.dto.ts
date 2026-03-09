import { IsUUID } from 'class-validator';

export class AddConversationParticipantDto {
  @IsUUID()
  userId!: string;
}
