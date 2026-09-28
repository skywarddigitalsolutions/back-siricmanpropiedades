import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PublicPropertiesService } from './public-properties.service';
import { Property } from '../entities/property.entity';
import {
  Currency,
  Operation,
  PropertyType,
  PublicationStatus,
} from '../enums/property.enums';
import { toPublicProperty } from '../helpers/public-property.mapper';

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
    firstPublishedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    updatedAt: new Date('2025-12-15T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PublicPropertiesService', () => {
  let service: PublicPropertiesService;
  let propertyRepository: any;

  beforeEach(async () => {
    propertyRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicPropertiesService,
        {
          provide: getRepositoryToken(Property),
          useValue: propertyRepository,
        },
      ],
    }).compile();

    service = module.get(PublicPropertiesService);
  });

  describe('findAll', () => {
    it('joins the neighborhood, applies the spec from buildPublicPropertyQuery, and returns { items, total } mapped through toPublicProperty', async () => {
      const rows = [
        propertyFixture({ id: 'property-1' }),
        propertyFixture({ id: 'property-2' }),
      ];
      const queryBuilder = chainableQueryBuilder(rows, 2);
      propertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

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
        'property.firstPublishedAt',
        'DESC',
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'property.id',
        'DESC',
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(12);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(result).toEqual({
        items: rows.map(toPublicProperty),
        total: 2,
      });
    });

    it('returns an empty items array with total 0 when nothing matches', async () => {
      const queryBuilder = chainableQueryBuilder([], 0);
      propertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({});

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('findBySlug', () => {
    it('returns the mapped property when it exists and is published', async () => {
      const property = propertyFixture({
        slug: 'casa-en-belgrano',
        publicationStatus: PublicationStatus.PUBLISHED,
      });
      propertyRepository.findOne.mockResolvedValue(property);

      const result = await service.findBySlug('casa-en-belgrano');

      expect(propertyRepository.findOne).toHaveBeenCalledWith({
        where: {
          slug: 'casa-en-belgrano',
          publicationStatus: PublicationStatus.PUBLISHED,
        },
        relations: ['neighborhood'],
      });
      expect(result).toEqual(toPublicProperty(property));
    });

    it('throws NotFoundException when the slug does not resolve to a published property', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('depto-en-caballito')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the slug does not exist at all', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
