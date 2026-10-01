import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PublicPropertiesService } from './public-properties.service';
import { Property } from '../entities/property.entity';
import { PropertyImage } from '../entities/property-image.entity';
import {
  Currency,
  Operation,
  PropertyType,
  PublicationStatus,
} from '../enums/property.enums';
import {
  toPublicPropertyDetail,
  toPublicPropertyListItem,
} from '../helpers/public-property.mapper';
import { PropertyImagesRepository } from '../images/property-images.repository';
import { MediaUrlBuilder } from '../../media/media-url.builder';

function chainableQueryBuilder(rows: unknown[], total: number) {
  const queryBuilder: Record<string, jest.Mock> = {};
  const chainable = [
    'innerJoinAndSelect',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'take',
    'skip',
  ];
  for (const method of chainable) {
    queryBuilder[method] = jest.fn(() => queryBuilder);
  }
  queryBuilder.getManyAndCount = jest.fn(async () => [rows, total]);
  return queryBuilder;
}

function propertyFixture(overrides: Partial<Property> = {}): Property {
  return {
    id: 'property-1',
    code: 'SP-101',
    slug: 'depto-en-palermo-sp-101',
    operation: Operation.SALE,
    type: PropertyType.APARTMENT,
    title: 'Depto en Palermo',
    description: null,
    neighborhood: {
      id: 'neighborhood-1',
      name: 'Palermo',
      slug: 'palermo',
      createdAt: new Date(),
    },
    address: 'Av. Santa Fe 3253',
    showExactAddress: false,
    currency: Currency.USD,
    price: 150000,
    expenses: null,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    hasGarage: false,
    coveredArea: 65,
    totalArea: 70,
    age: 5,
    creditEligible: false,
    petsAllowed: false,
    immediateAvailability: false,
    marketingTag: 'none' as Property['marketingTag'],
    featured: false,
    hasWater: false,
    hasNaturalGas: false,
    hasSewer: false,
    hasElectricity: false,
    hasInternet: false,
    publicationStatus: PublicationStatus.PUBLISHED,
    dealStatus: 'available' as Property['dealStatus'],
    isUnavailable: false,
    firstPublishedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    updatedAt: new Date('2025-12-15T00:00:00.000Z'),
    ...overrides,
  };
}

function imageFixture(overrides: Partial<PropertyImage> = {}): PropertyImage {
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

describe('PublicPropertiesService', () => {
  let service: PublicPropertiesService;
  let propertyRepository: any;
  let propertyImagesRepository: any;
  let mediaUrlBuilder: MediaUrlBuilder;

  beforeEach(async () => {
    propertyRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    propertyImagesRepository = {
      findCoversByPropertyIds: jest.fn().mockResolvedValue([]),
      findByPropertyId: jest.fn().mockResolvedValue([]),
    };

    mediaUrlBuilder = {
      toUrl: jest.fn((key: string) => `https://media.test/${key}`),
    } as unknown as MediaUrlBuilder;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicPropertiesService,
        {
          provide: getRepositoryToken(Property),
          useValue: propertyRepository,
        },
        {
          provide: PropertyImagesRepository,
          useValue: propertyImagesRepository,
        },
        { provide: MediaUrlBuilder, useValue: mediaUrlBuilder },
      ],
    }).compile();

    service = module.get(PublicPropertiesService);
  });

  describe('findAll', () => {
    it('joins the neighborhood, applies the spec from buildPublicPropertyQuery, and returns { items, total } mapped through toPublicPropertyListItem', async () => {
      const rows = [
        propertyFixture({ id: 'property-1' }),
        propertyFixture({ id: 'property-2' }),
      ];
      const cover = imageFixture({ propertyId: 'property-1' });
      const callOrder: string[] = [];
      const queryBuilder = chainableQueryBuilder(rows, 2);
      queryBuilder.getManyAndCount = jest.fn(async () => {
        callOrder.push('getManyAndCount');
        return [rows, 2];
      });
      propertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      propertyImagesRepository.findCoversByPropertyIds.mockImplementation(
        async () => {
          callOrder.push('findCoversByPropertyIds');
          return [cover];
        },
      );

      const result = await service.findAll({
        operation: Operation.SALE,
      });

      expect(propertyRepository.createQueryBuilder).toHaveBeenCalledWith(
        'property',
      );
      expect(queryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
        'property.neighborhood',
        'neighborhood',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'property.publicationStatus = :publicationStatus',
        { publicationStatus: PublicationStatus.PUBLISHED },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'property.operation = :operation',
        { operation: Operation.SALE },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'property.isUnavailable',
        'ASC',
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'property.firstPublishedAt',
        'DESC',
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'property.id',
        'DESC',
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(12);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);

      // The cover query runs exactly once, for the page's ids, after the
      // existing paginated query has already executed.
      expect(
        propertyImagesRepository.findCoversByPropertyIds,
      ).toHaveBeenCalledTimes(1);
      expect(
        propertyImagesRepository.findCoversByPropertyIds,
      ).toHaveBeenCalledWith(['property-1', 'property-2']);
      expect(callOrder).toEqual(['getManyAndCount', 'findCoversByPropertyIds']);

      expect(result).toEqual({
        items: [
          toPublicPropertyListItem(rows[0], cover, mediaUrlBuilder),
          toPublicPropertyListItem(rows[1], null, mediaUrlBuilder),
        ],
        total: 2,
      });
    });

    it('returns an empty items array with total 0 when nothing matches, and skips the cover query entirely', async () => {
      const queryBuilder = chainableQueryBuilder([], 0);
      propertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({});

      expect(result).toEqual({ items: [], total: 0 });
      expect(
        propertyImagesRepository.findCoversByPropertyIds,
      ).not.toHaveBeenCalled();
    });

    it('does not change total or the per-page item count when covers are present', async () => {
      const rows = [
        propertyFixture({ id: 'property-1' }),
        propertyFixture({ id: 'property-2' }),
      ];
      const queryBuilder = chainableQueryBuilder(rows, 2);
      propertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      propertyImagesRepository.findCoversByPropertyIds.mockResolvedValue([
        imageFixture({ propertyId: 'property-1' }),
        imageFixture({ propertyId: 'property-2' }),
      ]);

      const result = await service.findAll({});

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });
  });

  describe('findBySlug', () => {
    it('returns the mapped detail with the ordered gallery when it exists and is published', async () => {
      const property = propertyFixture({
        id: 'property-1',
        slug: 'casa-en-belgrano',
        publicationStatus: PublicationStatus.PUBLISHED,
      });
      const images = [
        imageFixture({ id: 'img-1', position: 0 }),
        imageFixture({
          id: 'img-2',
          position: 1,
          largeKey: 'properties/property-1/img-2-lg.webp',
          thumbKey: 'properties/property-1/img-2-thumb.webp',
        }),
      ];
      propertyRepository.findOne.mockResolvedValue(property);
      propertyImagesRepository.findByPropertyId.mockResolvedValue(images);

      const result = await service.findBySlug('casa-en-belgrano');

      expect(propertyRepository.findOne).toHaveBeenCalledWith({
        where: {
          slug: 'casa-en-belgrano',
          publicationStatus: PublicationStatus.PUBLISHED,
        },
        relations: ['neighborhood'],
      });
      expect(propertyImagesRepository.findByPropertyId).toHaveBeenCalledWith(
        'property-1',
      );
      expect(result).toEqual(
        toPublicPropertyDetail(property, images, mediaUrlBuilder),
      );
    });

    it('returns an empty images array when the property has no images', async () => {
      const property = propertyFixture({
        id: 'property-1',
        slug: 'casa-sin-fotos',
      });
      propertyRepository.findOne.mockResolvedValue(property);
      propertyImagesRepository.findByPropertyId.mockResolvedValue([]);

      const result = await service.findBySlug('casa-sin-fotos');

      expect(result.images).toEqual([]);
    });

    it('throws NotFoundException when the slug does not resolve to a published property', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('depto-en-caballito')).rejects.toThrow(
        NotFoundException,
      );
      expect(propertyImagesRepository.findByPropertyId).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the slug does not exist at all', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
