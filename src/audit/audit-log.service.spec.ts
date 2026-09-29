import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './enums/audit-action.enum';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let auditLogRepository: any;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    auditLogRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepository },
      ],
    }).compile();

    service = module.get(AuditLogService);
  });

  describe('record', () => {
    it('stores the actor data and metadata of the action', async () => {
      await service.record({
        actor: { id: 'admin-1', userName: 'admin' },
        action: AuditAction.USER_CREATED,
        entityType: 'user',
        entityId: 'user-1',
        metadata: { userName: 'john' },
      });

      expect(auditLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          actorUserName: 'admin',
          action: AuditAction.USER_CREATED,
          entityType: 'user',
          entityId: 'user-1',
          metadata: { userName: 'john' },
        }),
      );
    });

    it('stores null actor fields when no actor is provided (system action)', async () => {
      await service.record({
        action: AuditAction.ROLE_ASSIGNED,
        entityType: 'role',
        entityId: 'role-1',
      });

      expect(auditLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: null, actorUserName: null }),
      );
    });

    it('resolves (does not throw/reject) when the repository save rejects, and logs a warning', async () => {
      auditLogRepository.save.mockRejectedValueOnce(new Error('db down'));
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      await expect(
        service.record({
          action: AuditAction.PROPERTY_CREATED,
          entityType: 'property',
          entityId: 'property-1',
        }),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('property'));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('property-1'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(AuditAction.PROPERTY_CREATED),
      );

      warnSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    it('applies entityType/actorId filters and pagination', async () => {
      await service.findAll({
        entityType: 'user',
        actorId: 'admin-1',
        limit: 10,
        offset: 5,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'log.entityType = :entityType',
        { entityType: 'user' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'log.actorId = :actorId',
        { actorId: 'admin-1' },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    });
  });
});
