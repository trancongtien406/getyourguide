import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9][0-9]{6,14}$/)
  phoneE164?: string;
}
