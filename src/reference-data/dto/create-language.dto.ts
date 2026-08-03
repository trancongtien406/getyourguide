import { IsString, Length, MaxLength } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @Length(2, 10)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;
}
