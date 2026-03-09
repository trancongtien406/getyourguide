import { IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

export class UpdateCountryDto {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  iso2?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  iso3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}
