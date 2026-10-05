import { BadRequestException } from '@nestjs/common';
import {
  ADMIN_PROPERTY_SORTS,
  AdminPropertyFiltersDto,
} from '../dto/admin-property-filters.dto';
import {
  PublicPropertyFiltersDto,
  PublicPropertySort,
} from '../dto/public-property-filters.dto';
import { PublicationStatus } from '../enums/property.enums';

/**
 * A single `andWhere`-compatible clause: `sql` is the TypeORM condition
 * string with named parameters, `params` binds those names to values.
 */
export interface WhereClause {
  sql: string;
  params: Record<string, unknown>;
}

export interface OrderClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

/**
 * A plain, fully-serializable description of a query. The service applies
 * it to a real `SelectQueryBuilder` (`andWhere` per clause, `orderBy` for
 * the first entry then `addOrderBy` for the rest, `take`/`skip`), so every
 * filter combination can be asserted here without mocking TypeORM.
 */
export interface PropertyQuerySpec {
  where: WhereClause[];
  orderBy: OrderClause[];
  take: number;
  skip: number;
}

export const PROPERTY_ALIAS = 'property';
export const NEIGHBORHOOD_ALIAS = 'neighborhood';

const ADMIN_DEFAULT_LIMIT = 20;
const ADMIN_DEFAULT_OFFSET = 0;

/** Escapes `\`, `%`, and `_` so a caller-supplied value is safe inside ILIKE. */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Admin sort: column from a whitelist only (anything else falls back to
 * createdAt), direction from `order`, id as a stable tiebreaker. Prices of
 * different currencies are not comparable, so (like the public catalog)
 * sorting by price needs a currency.
 */
function adminOrderBy(filters: AdminPropertyFiltersDto): OrderClause[] {
  const sort = ADMIN_PROPERTY_SORTS.find((s) => s === filters.sort);
  if (sort === 'price' && filters.currency === undefined) {
    throw new BadRequestException('currency is required when sorting by price');
  }
  const direction = filters.order === 'asc' ? 'ASC' : 'DESC';
  return [
    { column: `${PROPERTY_ALIAS}.${sort ?? 'createdAt'}`, direction },
    { column: `${PROPERTY_ALIAS}.id`, direction },
  ];
}

/**
 * Builds the admin listing query spec (`GET /api/admin/properties`).
 * Unlike the public catalog, no `publicationStatus` is forced: admins see
 * every status unless they filter to one. See `buildPublicPropertyQuery`
 * (added in Phase 5a, same file) for the public counterpart.
 */
export function buildAdminPropertyQuery(
  filters: AdminPropertyFiltersDto,
): PropertyQuerySpec {
  const where: WhereClause[] = [];

  if (filters.publicationStatus !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.publicationStatus = :publicationStatus`,
      params: { publicationStatus: filters.publicationStatus },
    });
  }

  if (filters.dealStatus !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.dealStatus = :dealStatus`,
      params: { dealStatus: filters.dealStatus },
    });
  }

  if (filters.operation !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.operation = :operation`,
      params: { operation: filters.operation },
    });
  }

  if (filters.type !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.type = :type`,
      params: { type: filters.type },
    });
  }

  if (filters.neighborhoodId !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.neighborhood = :neighborhoodId`,
      params: { neighborhoodId: filters.neighborhoodId },
    });
  }

  if (filters.q !== undefined) {
    where.push({
      sql: `(${PROPERTY_ALIAS}.title ILIKE :q OR ${PROPERTY_ALIAS}.code ILIKE :q OR ${PROPERTY_ALIAS}.address ILIKE :q)`,
      params: { q: `%${escapeLikePattern(filters.q)}%` },
    });
  }

  if (filters.currency !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.currency = :currency`,
      params: { currency: filters.currency },
    });
  }

  if (filters.hasImages !== undefined) {
    where.push({
      sql: `${filters.hasImages ? '' : 'NOT '}EXISTS (SELECT 1 FROM property_images pi WHERE pi.property_id = ${PROPERTY_ALIAS}.id)`,
      params: {},
    });
  }

  return {
    where,
    orderBy: adminOrderBy(filters),
    take: filters.limit ?? ADMIN_DEFAULT_LIMIT,
    skip: filters.offset ?? ADMIN_DEFAULT_OFFSET,
  };
}

const PUBLIC_DEFAULT_LIMIT = 12;
const PUBLIC_DEFAULT_OFFSET = 0;
const PRICE_SORTS: ReadonlySet<PublicPropertySort> = new Set([
  'price_asc',
  'price_desc',
]);

/**
 * Every public sort first puts sold/rented properties after available and
 * reserved ones (they stay listed as social proof); the chosen sort applies
 * within each group. `isUnavailable` is a stored generated column (false
 * sorts first). Ordering by the `dealStatus` enum instead would split
 * reserved from available.
 */
const UNAVAILABLE_LAST: OrderClause = {
  column: `${PROPERTY_ALIAS}.isUnavailable`,
  direction: 'ASC',
};

function publicOrderBy(sort: PublicPropertySort | undefined): OrderClause[] {
  if (sort === 'price_asc') {
    return [
      UNAVAILABLE_LAST,
      { column: `${PROPERTY_ALIAS}.price`, direction: 'ASC' },
      { column: `${PROPERTY_ALIAS}.id`, direction: 'ASC' },
    ];
  }
  if (sort === 'price_desc') {
    return [
      UNAVAILABLE_LAST,
      { column: `${PROPERTY_ALIAS}.price`, direction: 'DESC' },
      { column: `${PROPERTY_ALIAS}.id`, direction: 'DESC' },
    ];
  }
  return [
    UNAVAILABLE_LAST,
    { column: `${PROPERTY_ALIAS}.firstPublishedAt`, direction: 'DESC' },
    { column: `${PROPERTY_ALIAS}.id`, direction: 'DESC' },
  ];
}

/**
 * Builds the public listing query spec (`GET /api/properties`). Unlike
 * `buildAdminPropertyQuery`, `publicationStatus = 'published'` is always the
 * first clause and cannot be overridden by any filter. Re-checks the
 * currency rule defensively so non-HTTP callers (bypassing the DTO's
 * `@RequiresCurrency`/`@IsGreaterThanOrEqualTo` validators) cannot mix
 * currencies or request an inverted price range.
 */
export function buildPublicPropertyQuery(
  filters: PublicPropertyFiltersDto,
): PropertyQuerySpec {
  const isPriceScoped =
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    (filters.sort !== undefined && PRICE_SORTS.has(filters.sort));

  if (isPriceScoped && filters.currency === undefined) {
    throw new BadRequestException(
      'currency is required when filtering or sorting by price',
    );
  }

  if (
    filters.priceMin !== undefined &&
    filters.priceMax !== undefined &&
    filters.priceMax < filters.priceMin
  ) {
    throw new BadRequestException(
      'priceMax must be greater than or equal to priceMin',
    );
  }

  const where: WhereClause[] = [
    {
      sql: `${PROPERTY_ALIAS}.publicationStatus = :publicationStatus`,
      params: { publicationStatus: PublicationStatus.PUBLISHED },
    },
  ];

  if (filters.operation !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.operation = :operation`,
      params: { operation: filters.operation },
    });
  }

  if (filters.type !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.type = :type`,
      params: { type: filters.type },
    });
  }

  if (filters.neighborhood !== undefined && filters.neighborhood.length > 0) {
    where.push({
      sql: `${NEIGHBORHOOD_ALIAS}.slug IN (:...neighborhoodSlugs)`,
      params: { neighborhoodSlugs: filters.neighborhood },
    });
  }

  if (filters.currency !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.currency = :currency`,
      params: { currency: filters.currency },
    });
  }

  if (filters.hasGarage !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.hasGarage = :hasGarage`,
      params: { hasGarage: filters.hasGarage },
    });
  }

  if (filters.creditEligible !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.creditEligible = :creditEligible`,
      params: { creditEligible: filters.creditEligible },
    });
  }

  if (filters.petsAllowed !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.petsAllowed = :petsAllowed`,
      params: { petsAllowed: filters.petsAllowed },
    });
  }

  if (filters.featured !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.featured = :featured`,
      params: { featured: filters.featured },
    });
  }

  if (filters.code !== undefined) {
    // Codes are stored uppercase ("SP-0007"); visitors may type "sp-0007 ".
    where.push({
      sql: `UPPER(${PROPERTY_ALIAS}.code) = :code`,
      params: { code: filters.code.trim().toUpperCase() },
    });
  }

  if (filters.minRooms !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.rooms >= :minRooms`,
      params: { minRooms: filters.minRooms },
    });
  }

  if (filters.minBedrooms !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.bedrooms >= :minBedrooms`,
      params: { minBedrooms: filters.minBedrooms },
    });
  }

  if (filters.minBathrooms !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.bathrooms >= :minBathrooms`,
      params: { minBathrooms: filters.minBathrooms },
    });
  }

  if (filters.minCoveredArea !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.coveredArea >= :minCoveredArea`,
      params: { minCoveredArea: filters.minCoveredArea },
    });
  }

  if (filters.minTotalArea !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.totalArea >= :minTotalArea`,
      params: { minTotalArea: filters.minTotalArea },
    });
  }

  if (filters.priceMin !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.price >= :priceMin`,
      params: { priceMin: filters.priceMin },
    });
  }

  if (filters.priceMax !== undefined) {
    where.push({
      sql: `${PROPERTY_ALIAS}.price <= :priceMax`,
      params: { priceMax: filters.priceMax },
    });
  }

  return {
    where,
    orderBy: publicOrderBy(filters.sort),
    take: filters.limit ?? PUBLIC_DEFAULT_LIMIT,
    skip: filters.offset ?? PUBLIC_DEFAULT_OFFSET,
  };
}
