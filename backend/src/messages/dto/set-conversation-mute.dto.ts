import { IsBoolean } from 'class-validator';

export class SetConversationMuteDto {
  @IsBoolean()
  muted!: boolean;
}