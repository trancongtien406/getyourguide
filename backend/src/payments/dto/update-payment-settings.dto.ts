import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

class GatewayConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  domesticOnly?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[A-Z]{2}|\*$/, { each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[A-Z]{3}|\*$/, { each: true })
  currencies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];
}

export class UpdatePaymentSettingsDto {
  @IsIn(['sandbox', 'live'])
  mode: 'sandbox' | 'live';

  @IsObject()
  @ValidateNested()
  @Type(() => GatewayConfigDto)
  gateways: Record<string, GatewayConfigDto>;
}
