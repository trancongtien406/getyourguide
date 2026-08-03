import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UserLifecycleActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
