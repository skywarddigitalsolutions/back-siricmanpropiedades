import { AdminPropertyFiltersDto } from '../dto/admin-property-filters.dto';

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
function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
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
      sql: `(${PROPERTY_ALIAS}.title ILIKE :q OR ${PROPERTY_ALIAS}.code ILIKE :q)`,
      params: { q: `%${escapeLikePattern(filters.q)}%` },
    });
  }

  return {
    where,
    orderBy: [
      { column: `${PROPERTY_ALIAS}.createdAt`, direction: 'DESC' },
      { column: `${PROPERTY_ALIAS}.id`, direction: 'DESC' },
    ],
    take: filters.limit ?? ADMIN_DEFAULT_LIMIT,
    skip: filters.offset ?? ADMIN_DEFAULT_OFFSET,
  };
}
