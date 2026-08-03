import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @Length(2, 2)
  iso2!: string;

  @IsString()
  @Length(3, 3)
  iso3!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @Length(3, 3)
  currencyCode!: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}
