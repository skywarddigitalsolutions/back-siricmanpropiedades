import { Property } from '../entities/property.entity';
import {
  Currency,
  DealStatus,
  MarketingTag,
  Operation,
  PropertyType,
  PublicationStatus,
} from '../enums/property.enums';
import { toPublicProperty } from './public-property.mapper';

function buildProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'property-1',
    code: 'SP-101',
    slug: 'depto-en-palermo-sp-101',
    operation: Operation.SALE,
    type: PropertyType.APARTMENT,
    title: 'Depto en Palermo',
    description: 'Lindo depto de 3 ambientes',
    neighborhood: {
      id: 'neighborhood-1',
      name: 'Palermo',
      slug: 'palermo',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    },
    address: 'Av. Santa Fe 3253',
    showExactAddress: false,
    currency: Currency.USD,
    price: 150000,
    expenses: 200,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    hasGarage: true,
    coveredArea: 65,
    totalArea: 70,
    age: 5,
    creditEligible: true,
    petsAllowed: false,
    immediateAvailability: true,
    marketingTag: MarketingTag.NEW,
    featured: true,
    hasWater: true,
    hasNaturalGas: false,
    hasSewer: true,
    hasElectricity: true,
    hasInternet: false,
    publicationStatus: PublicationStatus.PUBLISHED,
    dealStatus: DealStatus.AVAILABLE,
    firstPublishedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    updatedAt: new Date('2025-12-15T00:00:00.000Z'),
    ...overrides,
  };
}

describe('toPublicProperty', () => {
  it('hides the exact address when showExactAddress is false', () => {
    const property = buildProperty({ showExactAddress: false });

    const result = toPublicProperty(property);

    expect(result.address).toBeNull();
    expect(result.neighborhood).toEqual({ name: 'Palermo', slug: 'palermo' });
  });

  it('shows the exact address when showExactAddress is true', () => {
    const property = buildProperty({
      showExactAddress: true,
      address: 'Av. Cabildo 2500',
    });

    const result = toPublicProperty(property);

    expect(result.address).toBe('Av. Cabildo 2500');
  });

  it('omits internal fields (publicationStatus, showExactAddress, createdAt, updatedAt, neighborhood.id)', () => {
    const property = buildProperty();

    const result = toPublicProperty(property) as unknown as Record<
      string,
      unknown
    >;

    expect(result).not.toHaveProperty('publicationStatus');
    expect(result).not.toHaveProperty('showExactAddress');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
    expect((result.neighborhood as Record<string, unknown>).id).toBeUndefined();
  });

  it('groups the five service booleans under services', () => {
    const property = buildProperty({
      hasWater: true,
      hasNaturalGas: false,
      hasSewer: true,
      hasElectricity: true,
      hasInternet: false,
    });

    const result = toPublicProperty(property);

    expect(result.services).toEqual({
      water: true,
      naturalGas: false,
      sewer: true,
      electricity: true,
      internet: false,
    });
  });

  it('returns numeric fields as plain numbers', () => {
    const property = buildProperty({
      price: 150000,
      expenses: 200,
      coveredArea: 65,
      totalArea: 70,
    });

    const result = toPublicProperty(property);

    expect(result.price).toBe(150000);
    expect(result.expenses).toBe(200);
    expect(result.coveredArea).toBe(65);
    expect(result.totalArea).toBe(70);
    expect(typeof result.price).toBe('number');
  });

  it('maps publishedAt from firstPublishedAt', () => {
    const publishedDate = new Date('2026-02-01T00:00:00.000Z');
    const property = buildProperty({ firstPublishedAt: publishedDate });

    const result = toPublicProperty(property);

    expect(result.publishedAt).toBe(publishedDate);
  });

  it('maps publishedAt to null when the property was never published', () => {
    const property = buildProperty({ firstPublishedAt: null });

    const result = toPublicProperty(property);

    expect(result.publishedAt).toBeNull();
  });
});
