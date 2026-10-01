import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { MfaService } from './mfa.service';
import { User } from '../../users/entities/user.entity';
import { MfaBackupCode } from '../entities/mfa-backup-code.entity';
import { AuditLogService } from '../../audit/audit-log.service';
import { encryptSecret } from '../../common/utils/crypto.util';

const TEST_ENCRYPTION_KEY = 'a1'.repeat(32); // 64 caracteres hex (32 bytes)

describe('MfaService', () => {
  let service: MfaService;
  let userRepository: any;
  let backupCodeRepository: any;
  let auditLogService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (user) => user),
    };
    backupCodeRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      update: jest.fn(async () => ({ affected: 1 })),
      delete: jest.fn(),
    };
    auditLogService = { record: jest.fn() };

    const configService = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'MFA_ENCRYPTION_KEY') return TEST_ENCRYPTION_KEY;
        if (key === 'MFA_ISSUER') return fallback ?? 'BaseAuth';
        return fallback;
      }),
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(MfaBackupCode),
          useValue: backupCodeRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(MfaService);
  });

  describe('startEnrollment', () => {
    it('rejects when MFA is already enabled', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: true,
        password: await bcrypt.hash('Password1', 10),
      });

      await expect(
        service.startEnrollment('user-1', 'Password1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the password is wrong (a stolen token alone is not enough)', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        userName: 'john',
        mfaEnabled: false,
        password: await bcrypt.hash('Password1', 10),
      });

      await expect(
        service.startEnrollment('user-1', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('generates and persists an encrypted secret', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        userName: 'john',
        mfaEnabled: false,
        password: await bcrypt.hash('Password1', 10),
      });

      const result = await service.startEnrollment('user-1', 'Password1');

      expect(result.secret).toBeDefined();
      expect(result.otpauthUrl).toContain('otpauth://');
      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.mfaSecret).not.toBe(result.secret); // guardado cifrado, no en texto plano
    });
  });

  describe('confirmEnrollment', () => {
    it('rejects an invalid TOTP code', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        userName: 'john',
        mfaEnabled: false,
        mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
      });

      await expect(
        service.confirmEnrollment('user-1', '000000', {
          id: 'user-1',
          userName: 'john',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enables MFA and returns 10 backup codes for a valid code', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        userName: 'john',
        mfaEnabled: false,
        mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
      });
      const validCode = authenticator.generate(secret);

      const result = await service.confirmEnrollment('user-1', validCode, {
        id: 'user-1',
        userName: 'john',
      });

      expect(result.backupCodes).toHaveLength(10);
      expect(new Set(result.backupCodes).size).toBe(10); // todos distintos
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'mfa.enabled' }),
      );
    });

    it('rejects when there is no pending enrollment', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: false,
        mfaSecret: null,
      });

      await expect(
        service.confirmEnrollment('user-1', '123456', {
          id: 'user-1',
          userName: 'john',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disable', () => {
    it('blocks disabling MFA on an admin account', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'admin-1',
        password: await bcrypt.hash('Password1', 10),
        mfaEnabled: true,
        mfaSecret: encryptSecret(
          authenticator.generateSecret(),
          TEST_ENCRYPTION_KEY,
        ),
        userRoles: [{ role: { name: 'admin' } }],
      });

      await expect(
        service.disable('admin-1', 'Password1', '123456', {
          id: 'admin-1',
          userName: 'admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an incorrect password even with a valid code', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        password: await bcrypt.hash('Password1', 10),
        mfaEnabled: true,
        mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
        userRoles: [{ role: { name: 'user' } }],
      });

      await expect(
        service.disable(
          'user-1',
          'WrongPassword',
          authenticator.generate(secret),
          {
            id: 'user-1',
            userName: 'john',
          },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('disables MFA for a non-admin with the right password and code', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        password: await bcrypt.hash('Password1', 10),
        mfaEnabled: true,
        mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
        userRoles: [{ role: { name: 'user' } }],
      });

      await service.disable(
        'user-1',
        'Password1',
        authenticator.generate(secret),
        {
          id: 'user-1',
          userName: 'john',
        },
      );

      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.mfaEnabled).toBe(false);
      expect(savedUser.mfaSecret).toBeNull();
      expect(backupCodeRepository.delete).toHaveBeenCalledWith({
        userId: 'user-1',
      });
    });
  });

  describe('TOTP replay protection', () => {
    afterEach(() => jest.restoreAllMocks());

    const mfaUser = (secret: string, id = 'user-1') => ({
      id,
      mfaEnabled: true,
      mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
    });

    it('rejects the same TOTP code the second time', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue(mfaUser(secret));
      const code = authenticator.generate(secret);

      expect(await service.verifyLoginCode('user-1', code)).toBe(true);
      expect(await service.verifyLoginCode('user-1', code)).toBe(false);
    });

    it('rejects a code from an earlier time step than the last accepted one, accepts a later one', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue(mfaUser(secret));
      const now = 1_700_000_010_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      const current = authenticator.generate(secret);
      nowSpy.mockReturnValue(now - 30_000);
      const previous = authenticator.generate(secret);
      nowSpy.mockReturnValue(now + 30_000);
      const next = authenticator.generate(secret);
      nowSpy.mockReturnValue(now);

      expect(await service.verifyLoginCode('user-1', current)).toBe(true);
      expect(await service.verifyLoginCode('user-1', previous)).toBe(false);
      expect(await service.verifyLoginCode('user-1', next)).toBe(true);
    });

    it('tracks the last used step per user', async () => {
      const secret = authenticator.generateSecret();
      const code = authenticator.generate(secret);

      userRepository.findOne.mockResolvedValue(mfaUser(secret, 'user-1'));
      expect(await service.verifyLoginCode('user-1', code)).toBe(true);

      userRepository.findOne.mockResolvedValue(mfaUser(secret, 'user-2'));
      expect(await service.verifyLoginCode('user-2', code)).toBe(true);
    });

    it('does not consume a time step on a failed verification', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue(mfaUser(secret));

      expect(await service.verifyLoginCode('user-1', '000000')).toBe(false);
      expect(
        await service.verifyLoginCode('user-1', authenticator.generate(secret)),
      ).toBe(true);
    });
  });

  describe('verifyLoginCode / backup codes', () => {
    it('accepts a valid TOTP code', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: true,
        mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
      });

      const isValid = await service.verifyLoginCode(
        'user-1',
        authenticator.generate(secret),
      );

      expect(isValid).toBe(true);
    });

    it('falls back to an unused backup code when the TOTP code is wrong, and consumes it', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: true,
        mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
      });

      const backupCode = 'abc123def4';
      const candidate = {
        id: 'code-1',
        userId: 'user-1',
        codeHash: await bcrypt.hash(backupCode, 10),
        usedAt: null,
      };
      backupCodeRepository.find.mockResolvedValue([candidate]);

      const isValid = await service.verifyLoginCode('user-1', backupCode);

      expect(isValid).toBe(true);
      expect(backupCodeRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'code-1' }),
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
    });

    it('rejects a backup code that was already consumed by a concurrent request', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: true,
        mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
      });

      const backupCode = 'abc123def4';
      backupCodeRepository.find.mockResolvedValue([
        {
          id: 'code-1',
          userId: 'user-1',
          codeHash: await bcrypt.hash(backupCode, 10),
          usedAt: null,
        },
      ]);
      // Simula que otro request lo consumió entre el find y el update.
      backupCodeRepository.update.mockResolvedValue({ affected: 0 });

      const isValid = await service.verifyLoginCode('user-1', backupCode);

      expect(isValid).toBe(false);
    });

    it('rejects a code that matches neither TOTP nor any backup code', async () => {
      const secret = authenticator.generateSecret();
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: true,
        mfaSecret: encryptSecret(secret, TEST_ENCRYPTION_KEY),
      });
      backupCodeRepository.find.mockResolvedValue([]);

      const isValid = await service.verifyLoginCode('user-1', '000000');

      expect(isValid).toBe(false);
    });

    it('returns false when MFA is not enabled', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: false,
      });

      const isValid = await service.verifyLoginCode('user-1', '123456');

      expect(isValid).toBe(false);
    });
  });
});
