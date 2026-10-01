import { Property } from '../entities/property.entity';
import { PropertyImage } from '../entities/property-image.entity';
import {
  Currency,
  DealStatus,
  MarketingTag,
  Operation,
  PropertyType,
  PublicationStatus,
} from '../enums/property.enums';
import {
  toPublicProperty,
  toPublicPropertyDetail,
  toPublicPropertyListItem,
} from './public-property.mapper';
import type { MediaUrlBuilder } from '../../media/media-url.builder';

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
    isUnavailable: false,
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

function makeImage(overrides: Partial<PropertyImage> = {}): PropertyImage {
  return {
    id: 'img-1',
    propertyId: 'property-1',
    property: undefined,
    position: 0,
    largeKey: 'properties/property-1/img-1-lg.webp',
    thumbKey: 'properties/property-1/img-1-thumb.webp',
    width: 1920,
    height: 1080,
    thumbWidth: 480,
    thumbHeight: 270,
    largeBytes: 100_000,
    thumbBytes: 20_000,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeUrlBuilder(): MediaUrlBuilder {
  return {
    toUrl: jest.fn((key: string) => `https://media.example.com/${key}`),
  } as unknown as MediaUrlBuilder;
}

describe('toPublicPropertyListItem', () => {
  it('includes coverImage as the thumbnail URL of the position-0 image', () => {
    const property = buildProperty();
    const urls = makeUrlBuilder();
    const cover = makeImage();

    const result = toPublicPropertyListItem(property, cover, urls);

    expect(result.coverImage).toBe(
      'https://media.example.com/properties/property-1/img-1-thumb.webp',
    );
  });

  it('includes coverImage: null when the property has no images', () => {
    const property = buildProperty();
    const urls = makeUrlBuilder();

    const result = toPublicPropertyListItem(property, null, urls);

    expect(result.coverImage).toBeNull();
  });

  it('never includes a storage key or filesystem path', () => {
    const property = buildProperty();
    const urls = makeUrlBuilder();
    const cover = makeImage();

    const result = toPublicPropertyListItem(property, cover, urls);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('largeKey');
    expect(serialized).not.toContain('thumbKey');
  });

  it('still projects every base public property field', () => {
    const property = buildProperty();
    const urls = makeUrlBuilder();

    const result = toPublicPropertyListItem(property, null, urls);

    expect(result).toMatchObject(toPublicProperty(property));
  });
});

describe('toPublicPropertyDetail', () => {
  it('returns the ordered gallery and no separate coverImage field', () => {
    const property = buildProperty();
    const urls = makeUrlBuilder();
    const images = [
      makeImage({ id: 'img-1', position: 0 }),
      makeImage({
        id: 'img-2',
        position: 1,
        largeKey: 'properties/property-1/img-2-lg.webp',
        thumbKey: 'properties/property-1/img-2-thumb.webp',
      }),
    ];

    const result = toPublicPropertyDetail(property, images, urls);

    expect(result.images).toHaveLength(2);
    expect(result.images[0].url).toBe(
      'https://media.example.com/properties/property-1/img-1-lg.webp',
    );
    expect(result.images[1].url).toBe(
      'https://media.example.com/properties/property-1/img-2-lg.webp',
    );
    expect(result).not.toHaveProperty('coverImage');
  });

  it('returns an empty images array for a property with no images', () => {
    const property = buildProperty();
    const urls = makeUrlBuilder();

    const result = toPublicPropertyDetail(property, [], urls);

    expect(result.images).toEqual([]);
  });

  it('never includes a storage key or filesystem path', () => {
    const property = buildProperty();
    const urls = makeUrlBuilder();
    const images = [makeImage()];

    const result = toPublicPropertyDetail(property, images, urls);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('largeKey');
    expect(serialized).not.toContain('thumbKey');
  });

  it('still projects every base public property field', () => {
    const property = buildProperty();
    const urls = makeUrlBuilder();

    const result = toPublicPropertyDetail(property, [], urls);

    expect(result).toMatchObject(toPublicProperty(property));
  });
});
