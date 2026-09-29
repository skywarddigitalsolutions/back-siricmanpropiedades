import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { Property } from '../entities/property.entity';
import { Neighborhood } from '../../neighborhoods/entities/neighborhood.entity';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import {
  Currency,
  DealStatus,
  Operation,
  PropertyType,
  PublicationStatus,
} from '../enums/property.enums';
import { STORAGE_PORT } from '../../media/storage/storage.port';
import { PropertyImagesRepository } from '../images/property-images.repository';
import { MediaUrlBuilder } from '../../media/media-url.builder';
import { PropertyImage } from '../entities/property-image.entity';

const CREATE_DTO = {
  operation: Operation.SALE,
  type: PropertyType.APARTMENT,
  title: 'Departamento 3 ambientes en Palermo',
  neighborhoodId: 'neighborhood-1',
  address: 'Av. Santa Fe 3253',
  currency: Currency.USD,
  price: 150000,
  rooms: 3,
  bedrooms: 2,
  bathrooms: 1,
  coveredArea: 65,
  totalArea: 70,
  age: 5,
};

describe('PropertiesService', () => {
  let service: PropertiesService;
  let propertyRepository: any;
  let neighborhoodRepository: any;
  let auditLogService: any;
  let storagePort: any;
  let propertyImagesRepository: any;
  let mediaUrlBuilder: any;

  beforeEach(async () => {
    propertyRepository = {
      query: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (p) => ({ id: 'property-1', ...p })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    };

    neighborhoodRepository = {
      findOne: jest.fn(),
    };

    auditLogService = {
      record: jest.fn(),
    };

    storagePort = {
      deletePrefix: jest.fn().mockResolvedValue(undefined),
    };

    propertyImagesRepository = {
      findByPropertyId: jest.fn().mockResolvedValue([]),
    };

    mediaUrlBuilder = {
      toUrl: (key: string) => `https://media.test/${key}`,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: getRepositoryToken(Property),
          useValue: propertyRepository,
        },
        {
          provide: getRepositoryToken(Neighborhood),
          useValue: neighborhoodRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: STORAGE_PORT, useValue: storagePort },
        {
          provide: PropertyImagesRepository,
          useValue: propertyImagesRepository,
        },
        { provide: MediaUrlBuilder, useValue: mediaUrlBuilder },
      ],
    }).compile();

    service = module.get(PropertiesService);
  });

  describe('create', () => {
    it('reserves the next code, saves a draft property, and records an audit entry', async () => {
      neighborhoodRepository.findOne.mockResolvedValue({
        id: 'neighborhood-1',
        name: 'Palermo',
      });
      propertyRepository.query.mockResolvedValue([{ value: '101' }]);
      const actor = { id: 'admin-1', userName: 'admin' };

      const result = await service.create(CREATE_DTO, actor);

      expect(propertyRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('nextval'),
      );
      const savedArg = propertyRepository.save.mock.calls[0][0];
      expect(savedArg.code).toBe('SP-101');
      expect(savedArg.slug).toBe('departamento-3-ambientes-en-palermo-sp-101');
      expect(savedArg.publicationStatus).toBe('draft');
      expect(savedArg.dealStatus).toBe('available');
      expect(savedArg.firstPublishedAt).toBeNull();
      expect(result.id).toBe('property-1');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.PROPERTY_CREATED,
          entityType: 'property',
          entityId: 'property-1',
        }),
      );
    });

    it('rejects when the neighborhood does not exist, without reserving a code, saving, or auditing', async () => {
      neighborhoodRepository.findOne.mockResolvedValue(undefined);

      await expect(service.create(CREATE_DTO as any)).rejects.toThrow(
        BadRequestException,
      );

      expect(propertyRepository.query).not.toHaveBeenCalled();
      expect(propertyRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    function existingProperty(overrides: Record<string, unknown> = {}) {
      return {
        id: 'property-1',
        code: 'SP-101',
        slug: 'departamento-3-ambientes-en-palermo-sp-101',
        title: 'Departamento 3 ambientes en Palermo',
        firstPublishedAt: null,
        neighborhood: { id: 'neighborhood-1', name: 'Palermo' },
        ...overrides,
      };
    }

    it('regenerates the slug when title changes and firstPublishedAt is null', async () => {
      propertyRepository.findOne.mockResolvedValue(existingProperty());

      const result = await service.update('property-1', {
        title: 'Departamento a estrenar en Palermo',
      });

      expect(result.slug).toBe('departamento-a-estrenar-en-palermo-sp-101');
    });

    it('leaves the slug untouched when firstPublishedAt is set, even if title changes', async () => {
      propertyRepository.findOne.mockResolvedValue(
        existingProperty({ firstPublishedAt: new Date('2026-01-01') }),
      );

      const result = await service.update('property-1', {
        title: 'Departamento a estrenar en Palermo',
      });

      expect(result.slug).toBe('departamento-3-ambientes-en-palermo-sp-101');
    });

    it('is a no-op (no save, no audit) when the computed set of changed fields is empty', async () => {
      propertyRepository.findOne.mockResolvedValue(existingProperty());

      await service.update('property-1', {
        title: 'Departamento 3 ambientes en Palermo',
      });

      expect(propertyRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('saves and records PROPERTY_UPDATED with { code, changedFields } when fields change', async () => {
      propertyRepository.findOne.mockResolvedValue(existingProperty());
      const actor = { id: 'admin-1', userName: 'admin' };

      await service.update('property-1', { price: 160000 }, actor);

      expect(propertyRepository.save).toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.PROPERTY_UPDATED,
          entityType: 'property',
          entityId: 'property-1',
          metadata: { code: 'SP-101', changedFields: ['price'] },
        }),
      );
    });

    it('ignores any code/slug keys present on the incoming DTO object', async () => {
      propertyRepository.findOne.mockResolvedValue(existingProperty());

      const result = await service.update('property-1', {
        code: 'SP-999',
        slug: 'otra-cosa',
      } as any);

      expect(result.code).toBe('SP-101');
      expect(propertyRepository.save).not.toHaveBeenCalled();
    });

    it('applies a neighborhood change: looks up the new neighborhood, sets the relation, and records neighborhoodId in changedFields', async () => {
      propertyRepository.findOne.mockResolvedValue(existingProperty());
      neighborhoodRepository.findOne.mockResolvedValue({
        id: 'neighborhood-2',
        name: 'Belgrano',
      });
      const actor = { id: 'admin-1', userName: 'admin' };

      const result = await service.update(
        'property-1',
        { neighborhoodId: 'neighborhood-2' },
        actor,
      );

      expect(neighborhoodRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'neighborhood-2' },
      });
      expect(result.neighborhood).toEqual({
        id: 'neighborhood-2',
        name: 'Belgrano',
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.PROPERTY_UPDATED,
          entityType: 'property',
          entityId: 'property-1',
          metadata: { code: 'SP-101', changedFields: ['neighborhoodId'] },
        }),
      );
    });

    it('rejects a neighborhood change to a nonexistent neighborhood, without saving or auditing', async () => {
      propertyRepository.findOne.mockResolvedValue(existingProperty());
      neighborhoodRepository.findOne.mockResolvedValue(undefined);

      await expect(
        service.update('property-1', {
          neighborhoodId: 'missing-neighborhood',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(propertyRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('treats submitting the current neighborhoodId as a no-op for that field (no lookup, no save, no audit)', async () => {
      propertyRepository.findOne.mockResolvedValue(existingProperty());

      await service.update('property-1', { neighborhoodId: 'neighborhood-1' });

      expect(neighborhoodRepository.findOne).not.toHaveBeenCalled();
      expect(propertyRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the property joined with its neighborhood when found', async () => {
      const property = {
        id: 'property-1',
        code: 'SP-101',
        neighborhood: { id: 'neighborhood-1', name: 'Palermo' },
      };
      propertyRepository.findOne.mockResolvedValue(property);

      const result = await service.findOne('property-1');

      expect(propertyRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'property-1' },
        relations: ['neighborhood'],
      });
      expect(result).toBe(property);
    });

    it('throws NotFoundException when the property does not exist', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
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

    it('joins the neighborhood, applies every where clause and the order/take/skip from the spec, and returns { items, total }', async () => {
      const rows = [{ id: 'property-1' }, { id: 'property-2' }];
      const queryBuilder = chainableQueryBuilder(rows, 2);
      propertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({
        publicationStatus: PublicationStatus.DRAFT,
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
        { publicationStatus: PublicationStatus.DRAFT },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'property.createdAt',
        'DESC',
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'property.id',
        'DESC',
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(result).toEqual({ items: rows, total: 2 });
    });

    it('returns properties of every publication status when no filter is given', async () => {
      const rows = [
        { id: 'property-1', publicationStatus: PublicationStatus.DRAFT },
        { id: 'property-2', publicationStatus: PublicationStatus.PUBLISHED },
        { id: 'property-3', publicationStatus: PublicationStatus.ARCHIVED },
      ];
      const queryBuilder = chainableQueryBuilder(rows, 3);
      propertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({});

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual({ items: rows, total: 3 });
    });

    it('applies no where clause beyond the requested publicationStatus when filtering', async () => {
      const rows = [
        { id: 'property-1', publicationStatus: PublicationStatus.DRAFT },
      ];
      const queryBuilder = chainableQueryBuilder(rows, 1);
      propertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({
        publicationStatus: PublicationStatus.DRAFT,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ items: rows, total: 1 });
    });
  });

  describe('publish', () => {
    function draftProperty(overrides: Record<string, unknown> = {}) {
      return {
        id: 'property-1',
        code: 'SP-101',
        publicationStatus: PublicationStatus.DRAFT,
        firstPublishedAt: null,
        neighborhood: { id: 'neighborhood-1', name: 'Palermo' },
        ...overrides,
      };
    }

    it('sets firstPublishedAt on first publish, saves, and records PROPERTY_PUBLISHED with firstPublish: true', async () => {
      propertyRepository.findOne.mockResolvedValue(draftProperty());
      const actor = { id: 'admin-1', userName: 'admin' };

      const result = await service.publish('property-1', actor);

      expect(result.publicationStatus).toBe(PublicationStatus.PUBLISHED);
      expect(result.firstPublishedAt).toBeInstanceOf(Date);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.PROPERTY_PUBLISHED,
          entityType: 'property',
          entityId: 'property-1',
          metadata: {
            code: 'SP-101',
            from: PublicationStatus.DRAFT,
            firstPublish: true,
          },
        }),
      );
    });

    it('leaves firstPublishedAt unchanged on re-publish from archived and records firstPublish: false', async () => {
      const firstPublishedAt = new Date('2026-01-01');
      propertyRepository.findOne.mockResolvedValue(
        draftProperty({
          publicationStatus: PublicationStatus.ARCHIVED,
          firstPublishedAt,
        }),
      );

      const result = await service.publish('property-1');

      expect(result.publicationStatus).toBe(PublicationStatus.PUBLISHED);
      expect(result.firstPublishedAt).toBe(firstPublishedAt);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PROPERTY_PUBLISHED,
          metadata: {
            code: 'SP-101',
            from: PublicationStatus.ARCHIVED,
            firstPublish: false,
          },
        }),
      );
    });

    it('rejects an invalid transition (already published) without saving or auditing', async () => {
      propertyRepository.findOne.mockResolvedValue(
        draftProperty({ publicationStatus: PublicationStatus.PUBLISHED }),
      );

      await expect(service.publish('property-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(propertyRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the property does not exist', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(service.publish('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archive', () => {
    function property(overrides: Record<string, unknown> = {}) {
      return {
        id: 'property-1',
        code: 'SP-101',
        publicationStatus: PublicationStatus.PUBLISHED,
        firstPublishedAt: new Date('2026-01-01'),
        neighborhood: { id: 'neighborhood-1', name: 'Palermo' },
        ...overrides,
      };
    }

    it('archives from published, saves, and records PROPERTY_ARCHIVED with the prior status', async () => {
      propertyRepository.findOne.mockResolvedValue(property());
      const actor = { id: 'admin-1', userName: 'admin' };

      const result = await service.archive('property-1', actor);

      expect(result.publicationStatus).toBe(PublicationStatus.ARCHIVED);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.PROPERTY_ARCHIVED,
          entityType: 'property',
          entityId: 'property-1',
          metadata: { code: 'SP-101', from: PublicationStatus.PUBLISHED },
        }),
      );
    });

    it('throws BadRequestException when invoked on an already-archived property', async () => {
      propertyRepository.findOne.mockResolvedValue(
        property({ publicationStatus: PublicationStatus.ARCHIVED }),
      );

      await expect(service.archive('property-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(propertyRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('unpublish', () => {
    function publishedProperty(overrides: Record<string, unknown> = {}) {
      return {
        id: 'property-1',
        code: 'SP-101',
        publicationStatus: PublicationStatus.PUBLISHED,
        firstPublishedAt: new Date('2026-01-01'),
        neighborhood: { id: 'neighborhood-1', name: 'Palermo' },
        ...overrides,
      };
    }

    it('unpublishes to draft, keeps firstPublishedAt, and records PROPERTY_UNPUBLISHED', async () => {
      const firstPublishedAt = new Date('2026-01-01');
      propertyRepository.findOne.mockResolvedValue(
        publishedProperty({ firstPublishedAt }),
      );
      const actor = { id: 'admin-1', userName: 'admin' };

      const result = await service.unpublish('property-1', actor);

      expect(result.publicationStatus).toBe(PublicationStatus.DRAFT);
      expect(result.firstPublishedAt).toBe(firstPublishedAt);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.PROPERTY_UNPUBLISHED,
          entityType: 'property',
          entityId: 'property-1',
          metadata: { code: 'SP-101', from: PublicationStatus.PUBLISHED },
        }),
      );
    });

    it('throws BadRequestException when invoked on a draft property', async () => {
      propertyRepository.findOne.mockResolvedValue(
        publishedProperty({ publicationStatus: PublicationStatus.DRAFT }),
      );

      await expect(service.unpublish('property-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(propertyRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('updateDealStatus', () => {
    function property(overrides: Record<string, unknown> = {}) {
      return {
        id: 'property-1',
        code: 'SP-101',
        dealStatus: DealStatus.AVAILABLE,
        neighborhood: { id: 'neighborhood-1', name: 'Palermo' },
        ...overrides,
      };
    }

    it('succeeds for a new deal status from any publicationStatus and records PROPERTY_DEAL_STATUS_CHANGED', async () => {
      propertyRepository.findOne.mockResolvedValue(property());
      const actor = { id: 'admin-1', userName: 'admin' };

      const result = await service.updateDealStatus(
        'property-1',
        DealStatus.RESERVED,
        actor,
      );

      expect(result.dealStatus).toBe(DealStatus.RESERVED);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.PROPERTY_DEAL_STATUS_CHANGED,
          entityType: 'property',
          entityId: 'property-1',
          metadata: {
            code: 'SP-101',
            from: DealStatus.AVAILABLE,
            to: DealStatus.RESERVED,
          },
        }),
      );
    });

    it('rejects setting the current value again, without saving or auditing', async () => {
      propertyRepository.findOne.mockResolvedValue(
        property({ dealStatus: DealStatus.SOLD }),
      );

      await expect(
        service.updateDealStatus('property-1', DealStatus.SOLD),
      ).rejects.toThrow(BadRequestException);

      expect(propertyRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    function neverPublishedProperty(overrides: Record<string, unknown> = {}) {
      return {
        id: 'property-1',
        code: 'SP-101',
        title: 'Departamento 3 ambientes en Palermo',
        firstPublishedAt: null,
        neighborhood: { id: 'neighborhood-1', name: 'Palermo' },
        ...overrides,
      };
    }

    it('deletes the row and records PROPERTY_DELETED when firstPublishedAt is null', async () => {
      propertyRepository.findOne.mockResolvedValue(neverPublishedProperty());
      propertyRepository.delete.mockResolvedValue({ affected: 1 });
      const actor = { id: 'admin-1', userName: 'admin' };

      await service.remove('property-1', actor);

      expect(propertyRepository.delete).toHaveBeenCalledWith('property-1');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.PROPERTY_DELETED,
          entityType: 'property',
          entityId: 'property-1',
          metadata: {
            code: 'SP-101',
            title: 'Departamento 3 ambientes en Palermo',
          },
        }),
      );
    });

    it('rejects deletion when firstPublishedAt is set, without deleting or auditing', async () => {
      propertyRepository.findOne.mockResolvedValue(
        neverPublishedProperty({ firstPublishedAt: new Date('2026-01-01') }),
      );

      await expect(service.remove('property-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(propertyRepository.delete).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('calls storagePort.deletePrefix("properties/{id}/") after the row delete() succeeds', async () => {
      propertyRepository.findOne.mockResolvedValue(neverPublishedProperty());
      propertyRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('property-1');

      expect(storagePort.deletePrefix).toHaveBeenCalledWith(
        'properties/property-1/',
      );
      const deleteOrder = propertyRepository.delete.mock.invocationCallOrder[0];
      const deletePrefixOrder =
        storagePort.deletePrefix.mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(deletePrefixOrder);
    });

    it('logs a deletePrefix() failure but still resolves — the row deletion already succeeded', async () => {
      propertyRepository.findOne.mockResolvedValue(neverPublishedProperty());
      propertyRepository.delete.mockResolvedValue({ affected: 1 });
      storagePort.deletePrefix.mockRejectedValue(new Error('disk error'));

      await expect(service.remove('property-1')).resolves.toBeUndefined();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PROPERTY_DELETED }),
      );
    });
  });

  describe('findOneWithImages', () => {
    function property(overrides: Record<string, unknown> = {}) {
      return {
        id: 'property-1',
        code: 'SP-101',
        neighborhood: { id: 'neighborhood-1', name: 'Palermo' },
        ...overrides,
      };
    }

    function image(overrides: Partial<PropertyImage> = {}): PropertyImage {
      return {
        id: 'img-1',
        propertyId: 'property-1',
        position: 0,
        largeKey: 'properties/property-1/img-1-lg.webp',
        thumbKey: 'properties/property-1/img-1-thumb.webp',
        width: 1920,
        height: 1080,
        thumbWidth: 480,
        thumbHeight: 270,
        largeBytes: 5,
        thumbBytes: 5,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
      } as PropertyImage;
    }

    it('returns the property plus its images ordered ascending by position with large/thumb URLs', async () => {
      propertyRepository.findOne.mockResolvedValue(property());
      const images = [
        image({ id: 'img-1', position: 0 }),
        image({ id: 'img-2', position: 1 }),
      ];
      propertyImagesRepository.findByPropertyId.mockResolvedValue(images);

      const result = await service.findOneWithImages('property-1');

      expect(propertyImagesRepository.findByPropertyId).toHaveBeenCalledWith(
        'property-1',
      );
      expect(result.id).toBe('property-1');
      expect(result.images).toEqual([
        expect.objectContaining({
          id: 'img-1',
          position: 0,
          url: 'https://media.test/properties/property-1/img-1-lg.webp',
          thumbnailUrl:
            'https://media.test/properties/property-1/img-1-thumb.webp',
        }),
        expect.objectContaining({ id: 'img-2', position: 1 }),
      ]);
    });

    it('throws NotFoundException when the property does not exist', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneWithImages('missing-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('regression: findOne() stays unguarded — no images relation loaded, no extra query', async () => {
      const existing = property();
      propertyRepository.findOne.mockResolvedValue(existing);

      const result = await service.findOne('property-1');

      expect(result).toBe(existing);
      expect(propertyImagesRepository.findByPropertyId).not.toHaveBeenCalled();
    });
  });
});
