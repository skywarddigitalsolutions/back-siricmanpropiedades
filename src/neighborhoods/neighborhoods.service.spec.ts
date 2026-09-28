import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { NeighborhoodsService } from './neighborhoods.service';
import { Neighborhood } from './entities/neighborhood.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';

describe('NeighborhoodsService', () => {
  let service: NeighborhoodsService;
  let neighborhoodRepository: any;
  let auditLogService: any;

  beforeEach(async () => {
    neighborhoodRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (n) => ({ id: 'neighborhood-1', ...n })),
    };

    auditLogService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NeighborhoodsService,
        {
          provide: getRepositoryToken(Neighborhood),
          useValue: neighborhoodRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(NeighborhoodsService);
  });

  describe('findAll', () => {
    it('returns neighborhoods ordered by name', async () => {
      const rows = [{ id: '1', name: 'Almagro', slug: 'almagro' }];
      neighborhoodRepository.find.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(neighborhoodRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
      expect(result).toBe(rows);
    });
  });

  describe('create', () => {
    it('saves a new neighborhood and records an audit entry', async () => {
      neighborhoodRepository.findOne.mockResolvedValue(null);
      const actor = { id: 'admin-1', userName: 'admin' };

      const result = await service.create(
        { name: 'Villa Devoto Norte' },
        actor,
      );

      expect(neighborhoodRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('neighborhood-1');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: AuditAction.NEIGHBORHOOD_CREATED,
          entityType: 'neighborhood',
          entityId: 'neighborhood-1',
        }),
      );
    });

    it('rejects a duplicate name/slug without inserting a row or recording audit', async () => {
      neighborhoodRepository.findOne.mockResolvedValue({
        id: 'existing',
        name: 'Palermo',
        slug: 'palermo',
      });

      await expect(service.create({ name: 'Palermo' } as any)).rejects.toThrow(
        BadRequestException,
      );

      expect(neighborhoodRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('maps a 23505 unique-violation race from the repository to BadRequestException', async () => {
      neighborhoodRepository.findOne.mockResolvedValue(null);
      neighborhoodRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.create({ name: 'Palermo' } as any)).rejects.toThrow(
        BadRequestException,
      );

      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });
});
