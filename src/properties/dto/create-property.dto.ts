import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  MarketingTag,
  Operation,
  PropertyType,
} from '../enums/property.enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePropertyDto {
  @ApiProperty({ enum: Operation })
  @IsEnum(Operation)
  operation: Operation;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiProperty({ example: 'Departamento 3 ambientes en Palermo' })
  @Transform(trim)
  @IsString()
  @Length(5, 150)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  neighborhoodId: string;

  @ApiProperty({ example: 'Av. Santa Fe 3253' })
  @IsString()
  @Length(3, 200)
  address: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  showExactAddress?: boolean;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ example: 150000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999999999999)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expenses?: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  @Max(50)
  rooms: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  @Max(50)
  bedrooms: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  @Max(50)
  bathrooms: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasGarage?: boolean;

  @ApiProperty({ example: 65 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  coveredArea: number;

  @ApiProperty({ example: 70 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  totalArea: number;

  @ApiProperty({ example: 5, description: '0 means brand new' })
  @IsInt()
  @Min(0)
  @Max(300)
  age: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  creditEligible?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  petsAllowed?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  immediateAvailability?: boolean;

  @ApiPropertyOptional({ enum: MarketingTag })
  @IsOptional()
  @IsEnum(MarketingTag)
  marketingTag?: MarketingTag;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasWater?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasNaturalGas?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasSewer?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasElectricity?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasInternet?: boolean;
}
