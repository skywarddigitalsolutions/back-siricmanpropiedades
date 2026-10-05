import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, Operation, PropertyType } from '../enums/property.enums';
import {
  IsGreaterThanOrEqualTo,
  RequiresCurrency,
} from './validators/price-filter.validators';

export type PublicPropertySort = 'newest' | 'price_asc' | 'price_desc';

const PUBLIC_PROPERTY_SORT_VALUES: PublicPropertySort[] = [
  'newest',
  'price_asc',
  'price_desc',
];

const isDefined = (value: unknown) => value !== undefined;
const isPriceSort = (value: unknown) =>
  value === 'price_asc' || value === 'price_desc';

/** Coerces the literal query strings `'true'`/`'false'` to booleans; any
 * other value passes through unchanged so `@IsBoolean` rejects it. */
export const toQueryBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

/**
 * Query filters for `GET /api/properties` (public catalog). Numeric fields
 * need `@Type(() => Number)` because the global `ValidationPipe` does not
 * enable implicit conversion; every query string value arrives as a
 * `string`. Defaults (`limit = 12`, `offset = 0`, `sort = 'newest'`) are
 * applied by `buildPublicPropertyQuery`, not here, so this DTO stays purely
 * declarative. No `featured` field: the public `featured` toggle is an open
 * product decision not implemented by this change (see `design.md`).
 */
export class PublicPropertyFiltersDto {
  @ApiPropertyOptional({ enum: Operation })
  @IsOptional()
  @IsEnum(Operation)
  operation?: Operation;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({
    description:
      'Neighborhood slug, or several comma-separated (max 10), e.g. "palermo,belgrano"',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toSlugList(value))
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  @Matches(/^[a-z0-9-]+$/, { each: true })
  neighborhood?: string[];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minRooms?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBedrooms?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBathrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toQueryBoolean)
  @IsBoolean()
  hasGarage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toQueryBoolean)
  @IsBoolean()
  creditEligible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toQueryBoolean)
  @IsBoolean()
  petsAllowed?: boolean;

  @ApiPropertyOptional({ description: 'Only featured properties when true' })
  @IsOptional()
  @Transform(toQueryBoolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    description: 'Exact property code, case-insensitive, e.g. "SP-0007"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minCoveredArea?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minTotalArea?: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    minimum: 0,
    description: 'Requires currency to be set',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @RequiresCurrency(isDefined)
  priceMin?: number;

  @ApiPropertyOptional({
    minimum: 0,
    description: 'Requires currency to be set; must be >= priceMin',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @RequiresCurrency(isDefined)
  @IsGreaterThanOrEqualTo('priceMin')
  priceMax?: number;

  @ApiPropertyOptional({
    enum: PUBLIC_PROPERTY_SORT_VALUES,
    default: 'newest',
    description: 'price_asc/price_desc require currency to be set',
  })
  @IsOptional()
  @IsIn(PUBLIC_PROPERTY_SORT_VALUES)
  @RequiresCurrency(isPriceSort)
  sort?: PublicPropertySort;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

/** "Palermo, belgrano,palermo" → ["palermo", "belgrano"] (trimmed, lowercased, deduped). */
function toSlugList(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const slugs = value
    .split(',')
    .map((slug) => slug.trim().toLowerCase())
    .filter((slug) => slug.length > 0);
  return [...new Set(slugs)];
}
