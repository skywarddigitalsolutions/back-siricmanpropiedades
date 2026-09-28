import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DealStatus,
  Operation,
  PropertyType,
  PublicationStatus,
} from '../enums/property.enums';

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
    description: 'Free-text search matched against title or code (ILIKE)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

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
