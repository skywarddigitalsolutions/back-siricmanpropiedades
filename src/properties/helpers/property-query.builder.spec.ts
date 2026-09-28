import {
  buildAdminPropertyQuery,
  PROPERTY_ALIAS,
} from './property-query.builder';
import { AdminPropertyFiltersDto } from '../dto/admin-property-filters.dto';
import {
  DealStatus,
  Operation,
  PropertyType,
  PublicationStatus,
} from '../enums/property.enums';

function filters(
  overrides: Partial<AdminPropertyFiltersDto> = {},
): AdminPropertyFiltersDto {
  return { ...overrides };
}

describe('buildAdminPropertyQuery', () => {
  it('produces no where clause when every filter is omitted', () => {
    const spec = buildAdminPropertyQuery(filters());

    expect(spec.where).toEqual([]);
  });

  it('adds an equality clause for publicationStatus with a unique param name', () => {
    const spec = buildAdminPropertyQuery(
      filters({ publicationStatus: PublicationStatus.DRAFT }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.publicationStatus = :publicationStatus`,
      params: { publicationStatus: PublicationStatus.DRAFT },
    });
  });

  it('adds an equality clause for dealStatus with a unique param name', () => {
    const spec = buildAdminPropertyQuery(
      filters({ dealStatus: DealStatus.RESERVED }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.dealStatus = :dealStatus`,
      params: { dealStatus: DealStatus.RESERVED },
    });
  });

  it('adds an equality clause for operation with a unique param name', () => {
    const spec = buildAdminPropertyQuery(
      filters({ operation: Operation.RENT }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.operation = :operation`,
      params: { operation: Operation.RENT },
    });
  });

  it('adds an equality clause for type with a unique param name', () => {
    const spec = buildAdminPropertyQuery(filters({ type: PropertyType.HOUSE }));

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.type = :type`,
      params: { type: PropertyType.HOUSE },
    });
  });

  it('adds an equality clause for neighborhoodId with a unique param name', () => {
    const spec = buildAdminPropertyQuery(
      filters({ neighborhoodId: 'neighborhood-1' }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.neighborhood = :neighborhoodId`,
      params: { neighborhoodId: 'neighborhood-1' },
    });
  });

  it('combines every defined filter into distinct clauses, one per filter', () => {
    const spec = buildAdminPropertyQuery(
      filters({
        publicationStatus: PublicationStatus.PUBLISHED,
        dealStatus: DealStatus.AVAILABLE,
        operation: Operation.SALE,
        type: PropertyType.APARTMENT,
        neighborhoodId: 'neighborhood-1',
      }),
    );

    expect(spec.where).toHaveLength(5);
    const paramNames = spec.where.flatMap((clause) =>
      Object.keys(clause.params),
    );
    expect(new Set(paramNames).size).toBe(paramNames.length);
  });

  it('wraps q in % and escapes % and _ before building the ILIKE clause', () => {
    const spec = buildAdminPropertyQuery(filters({ q: '50%_off' }));

    expect(spec.where).toContainEqual({
      sql: `(${PROPERTY_ALIAS}.title ILIKE :q OR ${PROPERTY_ALIAS}.code ILIKE :q)`,
      params: { q: '%50\\%\\_off%' },
    });
  });

  it('defaults to ordering by createdAt DESC, id DESC', () => {
    const spec = buildAdminPropertyQuery(filters());

    expect(spec.orderBy).toEqual([
      { column: `${PROPERTY_ALIAS}.createdAt`, direction: 'DESC' },
      { column: `${PROPERTY_ALIAS}.id`, direction: 'DESC' },
    ]);
  });

  it('defaults take to 20 and skip to 0 when limit/offset are omitted', () => {
    const spec = buildAdminPropertyQuery(filters());

    expect(spec.take).toBe(20);
    expect(spec.skip).toBe(0);
  });

  it('uses the provided limit/offset for take/skip when present', () => {
    const spec = buildAdminPropertyQuery(filters({ limit: 5, offset: 15 }));

    expect(spec.take).toBe(5);
    expect(spec.skip).toBe(15);
  });
});
