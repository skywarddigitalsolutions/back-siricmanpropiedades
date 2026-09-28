import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { Property } from '../entities/property.entity';
import { Neighborhood } from '../../neighborhoods/entities/neighborhood.entity';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { Currency, Operation, PropertyType } from '../enums/property.enums';

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

  beforeEach(async () => {
    propertyRepository = {
      query: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (p) => ({ id: 'property-1', ...p })),
      findOne: jest.fn(),
    };

    neighborhoodRepository = {
      findOne: jest.fn(),
    };

    auditLogService = {
      record: jest.fn(),
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
});
