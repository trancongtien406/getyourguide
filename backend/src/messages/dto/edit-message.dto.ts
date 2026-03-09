import { IsOptional, IsString } from 'class-validator';

export class EditMessageDto {
  @IsOptional()
  @IsString()
  body?: string;
}