import { BadRequestException } from '@nestjs/common';
import {
  buildAdminPropertyQuery,
  buildPublicPropertyQuery,
  NEIGHBORHOOD_ALIAS,
  PROPERTY_ALIAS,
} from './property-query.builder';
import { AdminPropertyFiltersDto } from '../dto/admin-property-filters.dto';
import { PublicPropertyFiltersDto } from '../dto/public-property-filters.dto';
import {
  Currency,
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

function publicFilters(
  overrides: Partial<PublicPropertyFiltersDto> = {},
): PublicPropertyFiltersDto {
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

describe('buildPublicPropertyQuery', () => {
  it('always forces publicationStatus = published as the first clause, regardless of other filters', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({ operation: Operation.SALE }),
    );

    expect(spec.where[0]).toEqual({
      sql: `${PROPERTY_ALIAS}.publicationStatus = :publicationStatus`,
      params: { publicationStatus: PublicationStatus.PUBLISHED },
    });
  });

  it('produces only the forced publicationStatus clause when every filter is omitted', () => {
    const spec = buildPublicPropertyQuery(publicFilters());

    expect(spec.where).toHaveLength(1);
  });

  it('adds an equality clause for operation', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({ operation: Operation.RENT }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.operation = :operation`,
      params: { operation: Operation.RENT },
    });
  });

  it('adds an equality clause for type', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({ type: PropertyType.HOUSE }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.type = :type`,
      params: { type: PropertyType.HOUSE },
    });
  });

  it('adds an equality clause for the neighborhood slug', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({ neighborhood: 'palermo' }),
    );

    expect(spec.where).toContainEqual({
      sql: `${NEIGHBORHOOD_ALIAS}.slug = :neighborhoodSlug`,
      params: { neighborhoodSlug: 'palermo' },
    });
  });

  it.each([
    ['minRooms', 'rooms', 3],
    ['minBedrooms', 'bedrooms', 2],
    ['minBathrooms', 'bathrooms', 1],
    ['minCoveredArea', 'coveredArea', 50],
    ['minTotalArea', 'totalArea', 60],
  ] as const)('adds a >= clause for %s', (filterKey, column, value) => {
    const spec = buildPublicPropertyQuery(
      publicFilters({
        [filterKey]: value,
      }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.${column} >= :${filterKey}`,
      params: { [filterKey]: value },
    });
  });

  it.each([
    ['hasGarage', true],
    ['creditEligible', true],
    ['petsAllowed', false],
  ] as const)(
    'adds an equality clause for the %s toggle',
    (filterKey, value) => {
      const spec = buildPublicPropertyQuery(
        publicFilters({
          [filterKey]: value,
        }),
      );

      expect(spec.where).toContainEqual({
        sql: `${PROPERTY_ALIAS}.${filterKey} = :${filterKey}`,
        params: { [filterKey]: value },
      });
    },
  );

  it('produces no clause for an omitted filter', () => {
    const spec = buildPublicPropertyQuery(publicFilters());

    expect(
      spec.where.some((clause) => clause.sql.includes('neighborhoodSlug')),
    ).toBe(false);
  });

  it('scopes results to currency via an equality clause, even without a price filter', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({ currency: Currency.USD }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.currency = :currency`,
      params: { currency: Currency.USD },
    });
  });

  it('adds >= priceMin and <= priceMax clauses scoped by currency', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({
        currency: Currency.USD,
        priceMin: 50000,
        priceMax: 150000,
      }),
    );

    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.price >= :priceMin`,
      params: { priceMin: 50000 },
    });
    expect(spec.where).toContainEqual({
      sql: `${PROPERTY_ALIAS}.price <= :priceMax`,
      params: { priceMax: 150000 },
    });
  });

  it('gives every combined clause a unique param name', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({
        operation: Operation.SALE,
        type: PropertyType.APARTMENT,
        neighborhood: 'palermo',
        minRooms: 2,
        minBedrooms: 1,
        minBathrooms: 1,
        hasGarage: true,
        creditEligible: true,
        petsAllowed: true,
        minCoveredArea: 40,
        minTotalArea: 45,
        currency: Currency.USD,
        priceMin: 50000,
        priceMax: 150000,
      }),
    );

    const paramNames = spec.where.flatMap((clause) =>
      Object.keys(clause.params),
    );
    expect(new Set(paramNames).size).toBe(paramNames.length);
  });

  it('throws BadRequestException when priceMin is set without currency', () => {
    expect(() =>
      buildPublicPropertyQuery(publicFilters({ priceMin: 50000 })),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when priceMax is set without currency', () => {
    expect(() =>
      buildPublicPropertyQuery(publicFilters({ priceMax: 150000 })),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when sort is price_asc or price_desc without currency', () => {
    expect(() =>
      buildPublicPropertyQuery(publicFilters({ sort: 'price_asc' })),
    ).toThrow(BadRequestException);
    expect(() =>
      buildPublicPropertyQuery(publicFilters({ sort: 'price_desc' })),
    ).toThrow(BadRequestException);
  });

  it('does not throw when sort is newest without currency', () => {
    expect(() =>
      buildPublicPropertyQuery(publicFilters({ sort: 'newest' })),
    ).not.toThrow();
  });

  it('throws BadRequestException when priceMax is less than priceMin (defensive re-check)', () => {
    expect(() =>
      buildPublicPropertyQuery(
        publicFilters({
          currency: Currency.USD,
          priceMin: 200000,
          priceMax: 100000,
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('orders by firstPublishedAt DESC, id DESC by default (newest)', () => {
    const spec = buildPublicPropertyQuery(publicFilters());

    expect(spec.orderBy).toEqual([
      { column: `${PROPERTY_ALIAS}.firstPublishedAt`, direction: 'DESC' },
      { column: `${PROPERTY_ALIAS}.id`, direction: 'DESC' },
    ]);
  });

  it('orders by price ASC, id ASC for sort=price_asc', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({ currency: Currency.USD, sort: 'price_asc' }),
    );

    expect(spec.orderBy).toEqual([
      { column: `${PROPERTY_ALIAS}.price`, direction: 'ASC' },
      { column: `${PROPERTY_ALIAS}.id`, direction: 'ASC' },
    ]);
  });

  it('orders by price DESC, id DESC for sort=price_desc', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({ currency: Currency.ARS, sort: 'price_desc' }),
    );

    expect(spec.orderBy).toEqual([
      { column: `${PROPERTY_ALIAS}.price`, direction: 'DESC' },
      { column: `${PROPERTY_ALIAS}.id`, direction: 'DESC' },
    ]);
  });

  it('defaults take to 12 and skip to 0 when limit/offset are omitted', () => {
    const spec = buildPublicPropertyQuery(publicFilters());

    expect(spec.take).toBe(12);
    expect(spec.skip).toBe(0);
  });

  it('uses the provided limit/offset for take/skip when present', () => {
    const spec = buildPublicPropertyQuery(
      publicFilters({ limit: 24, offset: 48 }),
    );

    expect(spec.take).toBe(24);
    expect(spec.skip).toBe(48);
  });
});
