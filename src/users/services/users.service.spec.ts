import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { UserRolesService } from './user-roles.service';
import { AuditLogService } from '../../audit/audit-log.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;
  let userRolesService: any;
  let auditLogService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (user) => ({ id: user.id ?? 'user-1', ...user })),
    };

    userRolesService = {
      assignRole: jest.fn(),
      validateCanDeactivateUser: jest.fn(),
    };

    auditLogService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: UserRolesService, useValue: userRolesService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('rejects duplicate usernames', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          userName: 'john',
          password: 'Password1',
          roleId: 'role-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the user, hashes the password, assigns the role and records an audit entry', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null) // validateUniqueUserName: no existing user
        .mockResolvedValueOnce({ id: 'user-1', userName: 'john' }); // final findOne

      const actor = { id: 'admin-1', userName: 'admin' };
      await service.create(
        { userName: 'john', password: 'Password1', roleId: 'role-1' },
        actor,
      );

      expect(userRolesService.assignRole).toHaveBeenCalledWith(
        'user-1',
        'role-1',
        actor,
      );
      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.password).not.toBe('Password1');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor,
          action: 'user.created',
          entityType: 'user',
          entityId: 'user-1',
        }),
      );
    });
  });

  describe('activate', () => {
    it('throws when the user is already active', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        isActive: true,
      });

      await expect(service.activate('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deactivate', () => {
    it('propagates the "last admin" protection from UserRolesService', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        isActive: true,
      });
      userRolesService.validateCanDeactivateUser.mockRejectedValue(
        new BadRequestException('Cannot deactivate the only active admin user'),
      );

      await expect(service.deactivate('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deactivates a user when allowed', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        isActive: true,
      });
      userRolesService.validateCanDeactivateUser.mockResolvedValue(undefined);

      const result = await service.deactivate('user-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('hashes the new password before saving', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        password: 'old-hash',
      });

      await service.resetPassword('user-1', 'NewPassword1');

      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.password).not.toBe('NewPassword1');
      // Invalidates the user's existing sessions.
      expect(savedUser.passwordChangedAt).toBeInstanceOf(Date);
    });
  });
});
