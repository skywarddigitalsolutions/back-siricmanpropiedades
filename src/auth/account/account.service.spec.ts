import { BadRequestException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AccountService } from './account.service';
import { LoginThrottleService } from '../login-throttle.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';

describe('AccountService', () => {
  let service: AccountService;
  let userRepository: { findOne: jest.Mock; save: jest.Mock };
  let mfaService: {
    verifyLoginCode: jest.Mock;
    verifyTotpOnly: jest.Mock;
    regenerateBackupCodes: jest.Mock;
  };
  let authService: { logout: jest.Mock; buildSessionResponse: jest.Mock };
  let auditLogService: { record: jest.Mock };
  let throttle: LoginThrottleService;
  let stored: any;

  const actor = { id: 'user-1', userName: 'john' };

  beforeEach(async () => {
    stored = {
      id: 'user-1',
      userName: 'john',
      isActive: true,
      mfaEnabled: false,
      password: await bcrypt.hash('OldPassword1', 4),
      userRoles: [],
    };
    userRepository = {
      findOne: jest.fn(async () => stored),
      save: jest.fn(async (u) => u),
    };
    mfaService = {
      verifyLoginCode: jest.fn(),
      verifyTotpOnly: jest.fn(),
      regenerateBackupCodes: jest.fn(),
    };
    authService = {
      logout: jest.fn(),
      buildSessionResponse: jest.fn().mockReturnValue({ token: 'fresh' }),
    };
    auditLogService = { record: jest.fn() };
    throttle = new LoginThrottleService();
    service = new AccountService(
      userRepository as any,
      mfaService as any,
      authService as any,
      throttle,
      auditLogService as any,
    );
  });

  describe('changePassword', () => {
    const dto = {
      currentPassword: 'OldPassword1',
      newPassword: 'NewPassword2',
    };

    it('hashes the new password, stamps passwordChangedAt, revokes the current token and returns a fresh session', async () => {
      const before = Date.now();

      const result = await service.changePassword(
        actor as any,
        'old-token',
        dto,
      );

      const saved = userRepository.save.mock.calls[0][0];
      expect(await bcrypt.compare('NewPassword2', saved.password)).toBe(true);
      expect(saved.passwordChangedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(authService.logout).toHaveBeenCalledWith('old-token');
      expect(authService.buildSessionResponse).toHaveBeenCalledWith(saved);
      expect(result).toEqual({ token: 'fresh' });
      expect(auditLogService.record).toHaveBeenCalledWith({
        actor,
        action: AuditAction.PASSWORD_CHANGED,
        entityType: 'user',
        entityId: 'user-1',
      });
    });

    it('rejects a wrong current password without saving', async () => {
      await expect(
        service.changePassword(actor as any, 't', {
          ...dto,
          currentPassword: 'Nope12345',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a new password equal to the current one', async () => {
      await expect(
        service.changePassword(actor as any, 't', {
          currentPassword: 'OldPassword1',
          newPassword: 'OldPassword1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('locks after 5 wrong current passwords', async () => {
      for (let i = 0; i < 5; i++) {
        await expect(
          service.changePassword(actor as any, 't', {
            ...dto,
            currentPassword: 'Nope12345',
          }),
        ).rejects.toThrow(BadRequestException);
      }

      await expect(
        service.changePassword(actor as any, 't', dto),
      ).rejects.toThrow(HttpException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    describe('with MFA enabled', () => {
      beforeEach(() => {
        stored.mfaEnabled = true;
      });

      it('requires a code', async () => {
        await expect(
          service.changePassword(actor as any, 't', dto),
        ).rejects.toThrow(BadRequestException);
        expect(mfaService.verifyLoginCode).not.toHaveBeenCalled();
      });

      it('rejects an invalid code and counts it on the per-user MFA lockout', async () => {
        mfaService.verifyLoginCode.mockResolvedValue(false);
        for (let i = 0; i < 5; i++) {
          await expect(
            service.changePassword(actor as any, 't', {
              ...dto,
              code: '000000',
            }),
          ).rejects.toThrow(BadRequestException);
        }

        expect(() =>
          throttle.assertNotLocked(LoginThrottleService.mfaKey('user-1')),
        ).toThrow(HttpException);
        expect(userRepository.save).not.toHaveBeenCalled();
      });

      it('accepts a valid TOTP or backup code', async () => {
        mfaService.verifyLoginCode.mockResolvedValue(true);

        await service.changePassword(actor as any, 't', {
          ...dto,
          code: '123456',
        });

        expect(mfaService.verifyLoginCode).toHaveBeenCalledWith(
          'user-1',
          '123456',
        );
        expect(userRepository.save).toHaveBeenCalled();
      });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('rejects when the account has no MFA', async () => {
      await expect(
        service.regenerateBackupCodes(actor as any, '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid TOTP code', async () => {
      stored.mfaEnabled = true;
      mfaService.verifyTotpOnly.mockResolvedValue(false);

      await expect(
        service.regenerateBackupCodes(actor as any, '000000'),
      ).rejects.toThrow(BadRequestException);
      expect(mfaService.regenerateBackupCodes).not.toHaveBeenCalled();
    });

    it('returns the new codes once for a valid TOTP code', async () => {
      stored.mfaEnabled = true;
      mfaService.verifyTotpOnly.mockResolvedValue(true);
      mfaService.regenerateBackupCodes.mockResolvedValue(['a', 'b']);

      await expect(
        service.regenerateBackupCodes(actor as any, '123456'),
      ).resolves.toEqual({ backupCodes: ['a', 'b'] });
      expect(mfaService.regenerateBackupCodes).toHaveBeenCalledWith(
        'user-1',
        actor,
      );
    });
  });
});
