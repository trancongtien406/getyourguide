import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminResetUserPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
