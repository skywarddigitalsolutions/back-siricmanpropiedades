import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { UserRole } from '../../user-roles/entities/user-role.entity';
import { Role } from '../../roles/entities/role.entity';
import { AuditLogService } from '../../audit/audit-log.service';

describe('UserRolesService', () => {
  let service: UserRolesService;
  let userRoleRepository: any;
  let roleRepository: any;
  let queryBuilder: any;
  let auditLogService: any;

  beforeEach(async () => {
    queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };

    userRoleRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    roleRepository = {
      findOne: jest.fn(),
    };

    auditLogService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRolesService,
        { provide: getRepositoryToken(UserRole), useValue: userRoleRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(UserRolesService);
  });

  describe('hasRole', () => {
    it('returns true when the role is found among any of the user roles', async () => {
      queryBuilder.getCount.mockResolvedValue(1);

      const result = await service.hasRole('user-1', 'admin');

      expect(result).toBe(true);
      expect(userRoleRepository.createQueryBuilder).toHaveBeenCalledWith('ur');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(role.name) = LOWER(:roleName)',
        { roleName: 'admin' },
      );
    });

    it('returns false when none of the user roles match', async () => {
      queryBuilder.getCount.mockResolvedValue(0);

      const result = await service.hasRole('user-1', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('assignRole', () => {
    it('rejects assigning the admin role directly', async () => {
      roleRepository.findOne.mockResolvedValue({ id: 'role-1', name: 'admin' });

      await expect(service.assignRole('user-1', 'role-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the role does not exist', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.assignRole('user-1', 'role-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects assigning a role the user already has (instead of a PK error)', async () => {
      roleRepository.findOne.mockResolvedValue({
        id: 'role-1',
        name: 'manager',
      });
      userRoleRepository.findOne.mockResolvedValue({
        userId: 'user-1',
        roleId: 'role-1',
      });

      await expect(service.assignRole('user-1', 'role-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(userRoleRepository.save).not.toHaveBeenCalled();
    });

    it('assigns a non-admin role and records an audit entry', async () => {
      roleRepository.findOne.mockResolvedValue({
        id: 'role-1',
        name: 'manager',
      });
      const actor = { id: 'admin-1', userName: 'admin' };

      const result = await service.assignRole('user-1', 'role-1', actor);

      expect(userRoleRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ userId: 'user-1', roleId: 'role-1' });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: 'role.assigned',
          entityType: 'user',
          entityId: 'user-1',
          metadata: { roleId: 'role-1', roleName: 'manager' },
        }),
      );
    });
  });

  describe('validateCanDeactivateUser', () => {
    it('allows deactivating a non-admin user', async () => {
      queryBuilder.getCount.mockResolvedValueOnce(0); // hasRole('admin') -> false

      await expect(
        service.validateCanDeactivateUser('user-1'),
      ).resolves.toBeUndefined();
    });

    it('blocks deactivating the only active admin', async () => {
      queryBuilder.getCount
        .mockResolvedValueOnce(1) // hasRole('admin') -> true
        .mockResolvedValueOnce(1); // activeAdminsCount

      await expect(service.validateCanDeactivateUser('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows deactivating an admin when there are other active admins', async () => {
      queryBuilder.getCount
        .mockResolvedValueOnce(1) // hasRole('admin') -> true
        .mockResolvedValueOnce(2); // activeAdminsCount

      await expect(
        service.validateCanDeactivateUser('user-1'),
      ).resolves.toBeUndefined();
    });
  });
});
