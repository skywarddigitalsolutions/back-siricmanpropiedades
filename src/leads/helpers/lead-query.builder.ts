import { AdminLeadFiltersDto } from '../dto/admin-lead.dto';
import {
  escapeLikePattern,
  WhereClause,
} from '../../properties/helpers/property-query.builder';

export const LEAD_ALIAS = 'lead';

/**
 * `andWhere` clauses for the admin inbox filters. The per-status counts reuse
 * it with `includeStatus: false`, so each tab shows how many leads it would
 * hold under the other active filters. Every value is a bound parameter.
 */
export function buildLeadWhere(
  filters: AdminLeadFiltersDto,
  options: { includeStatus?: boolean } = {},
): WhereClause[] {
  const where: WhereClause[] = [];

  if (filters.status !== undefined && options.includeStatus !== false) {
    where.push({
      sql: `${LEAD_ALIAS}.status = :status`,
      params: { status: filters.status },
    });
  }
  if (filters.type !== undefined) {
    where.push({
      sql: `${LEAD_ALIAS}.type = :type`,
      params: { type: filters.type },
    });
  }
  if (filters.propertyId !== undefined) {
    where.push({
      sql: `${LEAD_ALIAS}.property = :propertyId`,
      params: { propertyId: filters.propertyId },
    });
  }
  if (filters.q !== undefined) {
    where.push({
      sql: `(${LEAD_ALIAS}.name ILIKE :q OR ${LEAD_ALIAS}.email ILIKE :q OR ${LEAD_ALIAS}.phone ILIKE :q OR ${LEAD_ALIAS}.message ILIKE :q)`,
      params: { q: `%${escapeLikePattern(filters.q)}%` },
    });
  }
  return where;
}
