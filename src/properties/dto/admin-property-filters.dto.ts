import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { toQueryBoolean } from './public-property-filters.dto';
import { RequiresCurrency } from './validators/price-filter.validators';
import {
  Currency,
  DealStatus,
  Operation,
  PropertyType,
  PublicationStatus,
} from '../enums/property.enums';

export type AdminPropertySort = 'createdAt' | 'updatedAt' | 'price';
export const ADMIN_PROPERTY_SORTS: AdminPropertySort[] = [
  'createdAt',
  'updatedAt',
  'price',
];

/**
 * Query filters for `GET /api/admin/properties`. `limit`/`offset` need
 * `@Type(() => Number)` because the global `ValidationPipe` does not enable
 * implicit conversion; every query string value arrives as a `string`.
 * Defaults (`limit = 20`, `offset = 0`) are applied by
 * `buildAdminPropertyQuery`, not here, so this DTO stays purely declarative.
 */
export class AdminPropertyFiltersDto {
  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  publicationStatus?: PublicationStatus;

  @ApiPropertyOptional({ enum: DealStatus })
  @IsOptional()
  @IsEnum(DealStatus)
  dealStatus?: DealStatus;

  @ApiPropertyOptional({ enum: Operation })
  @IsOptional()
  @IsEnum(Operation)
  operation?: Operation;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  neighborhoodId?: string;

  @ApiPropertyOptional({
    description:
      'Free-text search matched against title, code or address (ILIKE)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    enum: Currency,
    description: 'Only this currency; required to sort by price',
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Only with (true) or without (false) photos',
  })
  @IsOptional()
  @Transform(toQueryBoolean)
  @IsBoolean()
  hasImages?: boolean;

  @ApiPropertyOptional({ enum: ADMIN_PROPERTY_SORTS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ADMIN_PROPERTY_SORTS)
  @RequiresCurrency((value) => value === 'price')
  sort?: AdminPropertySort;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
