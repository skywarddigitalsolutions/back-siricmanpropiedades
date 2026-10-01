import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import { User } from '../users/entities/user.entity';
import { RevokedToken } from './entities/revoked-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let revokedTokenRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; decode: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (user) => {
        user.id = user.id ?? 'user-id';
        return user;
      }),
    };
    revokedTokenRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
      delete: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt-token'),
      decode: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        LoginThrottleService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(RevokedToken),
          useValue: revokedTokenRepository,
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('returns a token and roles when credentials are valid and MFA is not enabled', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        userName: 'john',
        password: hashedPassword,
        isActive: true,
        mfaEnabled: false,
        userRoles: [{ role: { name: 'user' } }],
      });

      const result = (await service.login({
        userName: 'john',
        password: 'Password1',
      })) as any;

      expect(result.token).toBe('signed-jwt-token');
      expect(result.roles).toEqual(['user']);
    });

    it('locks the account after 5 failed attempts (per-account brute force protection)', async () => {
      userRepository.findOne.mockResolvedValue(null);

      for (let i = 0; i < 5; i++) {
        await expect(
          service.login({ userName: 'victim', password: 'Wrong1' } as any),
        ).rejects.toThrow(UnauthorizedException);
      }

      // El sexto intento ya no llega a validar credenciales: 429 por bloqueo.
      await expect(
        service.login({ userName: 'victim', password: 'Wrong1' } as any),
      ).rejects.toThrow(HttpException);
      await expect(
        service.login({ userName: 'victim', password: 'Wrong1' } as any),
      ).rejects.toMatchObject({ status: 429 });
    });

    it('keys the lockout by (userName, IP): failures from IP A do not lock the user out from IP B', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const wrong = { userName: 'victim', password: 'Wrong1' } as any;

      for (let i = 0; i < 5; i++) {
        await expect(service.login(wrong, '1.1.1.1')).rejects.toThrow(
          UnauthorizedException,
        );
      }
      await expect(service.login(wrong, '1.1.1.1')).rejects.toMatchObject({
        status: 429,
      });

      // Desde otra IP la cuenta sigue accesible (no es 429).
      await expect(service.login(wrong, '2.2.2.2')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('does not reset password failures on a correct password when MFA is still pending', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        userName: 'john',
        password: hashedPassword,
        isActive: true,
        mfaEnabled: true,
        userRoles: [{ role: { name: 'user' } }],
      });
      const wrong = { userName: 'john', password: 'Wrong1' } as any;

      for (let i = 0; i < 4; i++) {
        await expect(service.login(wrong, '1.1.1.1')).rejects.toThrow(
          UnauthorizedException,
        );
      }
      // Password correcta (falta MFA): no limpia el contador.
      await service.login(
        { userName: 'john', password: 'Password1' },
        '1.1.1.1',
      );
      // El quinto fallo ya bloquea.
      await expect(service.login(wrong, '1.1.1.1')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(wrong, '1.1.1.1')).rejects.toMatchObject({
        status: 429,
      });
    });

    it('clearPasswordFailures (called after MFA succeeds) resets the counter', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const wrong = { userName: 'john', password: 'Wrong1' } as any;

      for (let i = 0; i < 4; i++) {
        await expect(service.login(wrong, '1.1.1.1')).rejects.toThrow(
          UnauthorizedException,
        );
      }
      service.clearPasswordFailures('John', '1.1.1.1');
      for (let i = 0; i < 2; i++) {
        await expect(service.login(wrong, '1.1.1.1')).rejects.toThrow(
          UnauthorizedException,
        );
      }
    });

    it('resets password failures immediately for users without MFA', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        userName: 'john',
        password: hashedPassword,
        isActive: true,
        mfaEnabled: false,
        userRoles: [{ role: { name: 'user' } }],
      });
      const wrong = { userName: 'john', password: 'Wrong1' } as any;

      for (let i = 0; i < 4; i++) {
        await expect(service.login(wrong, '1.1.1.1')).rejects.toThrow(
          UnauthorizedException,
        );
      }
      await service.login(
        { userName: 'john', password: 'Password1' },
        '1.1.1.1',
      );
      for (let i = 0; i < 4; i++) {
        await expect(service.login(wrong, '1.1.1.1')).rejects.toThrow(
          UnauthorizedException,
        );
      }
    });

    it('returns mfaRequired + a short-lived mfaToken instead of a full session when MFA is enabled', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        userName: 'john',
        password: hashedPassword,
        isActive: true,
        mfaEnabled: true,
        userRoles: [{ role: { name: 'user' } }],
      });

      const result = (await service.login({
        userName: 'john',
        password: 'Password1',
      })) as any;

      expect(result.mfaRequired).toBe(true);
      expect(result.mfaToken).toBe('signed-jwt-token');
      expect(result.token).toBeUndefined();
    });

    it('forces MFA setup (does not return a full session) for an admin without MFA enabled', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'admin-id',
        userName: 'admin',
        password: hashedPassword,
        isActive: true,
        mfaEnabled: false,
        userRoles: [{ role: { name: 'admin' } }],
      });

      const result = (await service.login({
        userName: 'admin',
        password: 'Password1',
      })) as any;

      expect(result.mfaSetupRequired).toBe(true);
      expect(result.setupToken).toBe('signed-jwt-token');
      expect(result.token).toBeUndefined();
    });

    it('returns a full session for an admin that already has MFA enabled', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'admin-id',
        userName: 'admin',
        password: hashedPassword,
        isActive: true,
        mfaEnabled: true,
        userRoles: [{ role: { name: 'admin' } }],
      });

      const result = (await service.login({
        userName: 'admin',
        password: 'Password1',
      })) as any;

      expect(result.mfaRequired).toBe(true);
      expect(result.mfaSetupRequired).toBeUndefined();
    });

    it('rejects when the user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ userName: 'ghost', password: 'Password1' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the password is wrong', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        userName: 'john',
        password: hashedPassword,
        isActive: true,
        userRoles: [],
      });

      await expect(
        service.login({ userName: 'john', password: 'WrongPassword1' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the user is inactive', async () => {
      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        userName: 'john',
        password: hashedPassword,
        isActive: false,
        userRoles: [],
      });

      await expect(
        service.login({ userName: 'john', password: 'Password1' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns the exact same error message regardless of the failure reason (anti-enumeration)', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      let messageForMissingUser = '';
      try {
        await service.login({
          userName: 'ghost',
          password: 'Password1',
        });
      } catch (error) {
        messageForMissingUser = error.message;
      }

      const hashedPassword = await bcrypt.hash('Password1', 10);
      userRepository.findOne.mockResolvedValueOnce({
        id: 'user-id',
        userName: 'john',
        password: hashedPassword,
        isActive: true,
        userRoles: [],
      });
      let messageForWrongPassword = '';
      try {
        await service.login({
          userName: 'john',
          password: 'WrongPassword1',
        });
      } catch (error) {
        messageForWrongPassword = error.message;
      }

      expect(messageForMissingUser).toBe(messageForWrongPassword);
    });
  });

  describe('checkAuthStatus', () => {
    it('rotates the token: revokes the current one and issues a new one', async () => {
      jwtService.decode.mockReturnValue({
        id: 'user-id',
        jti: 'old-jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const user = {
        id: 'user-id',
        userName: 'john',
        isActive: true,
        userRoles: [{ role: { name: 'user' } }],
      } as any;

      const result = await service.checkAuthStatus(user, 'current.jwt.token');

      expect(result.token).toBe('signed-jwt-token');
      expect(result.roles).toEqual(['user']);
      expect(revokedTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ jti: 'old-jti' }),
      );
    });
  });

  describe('logout', () => {
    it('stores the token jti as revoked', async () => {
      jwtService.decode.mockReturnValue({
        id: 'user-id',
        jti: 'abc-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await service.logout('some.jwt.token');

      expect(revokedTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ jti: 'abc-123' }),
      );
    });

    it('does nothing when the token has no jti', async () => {
      jwtService.decode.mockReturnValue({ id: 'user-id' });

      await service.logout('some.jwt.token');

      expect(revokedTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('toSessionUser', () => {
    it('maps the user entity and its roles to { id, userName, isActive, roles }', () => {
      const user = {
        id: 'user-id',
        userName: 'john',
        isActive: true,
        userRoles: [{ role: { name: 'admin' } }, { role: { name: 'manager' } }],
      } as any;

      const result = service.toSessionUser(user);

      expect(result).toEqual({
        id: 'user-id',
        userName: 'john',
        isActive: true,
        roles: ['admin', 'manager'],
      });
    });

    it('does not sign a new token or revoke any token', () => {
      const user = {
        id: 'user-id',
        userName: 'john',
        isActive: true,
        userRoles: [],
      } as any;

      service.toSessionUser(user);

      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(revokedTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('resolveUserFromToken', () => {
    it('resolves the user when the token scope is allowed', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-id', jti: 'jti-1' });
      revokedTokenRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        userName: 'john',
        isActive: true,
        userRoles: [],
      });

      const user = await service.resolveUserFromToken('token', [undefined]);

      expect(user.id).toBe('user-id');
    });

    it('rejects a token whose scope is not in the allowed list (e.g. a mfa_setup token used elsewhere)', async () => {
      jwtService.verify.mockReturnValue({
        id: 'user-id',
        jti: 'jti-1',
        scope: 'mfa_setup',
      });

      await expect(
        service.resolveUserFromToken('token', ['mfa_verify']),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a revoked token even if the scope is allowed', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-id', jti: 'jti-1' });
      revokedTokenRepository.findOne.mockResolvedValue({ jti: 'jti-1' });

      await expect(
        service.resolveUserFromToken('token', [undefined]),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an invalid or expired token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.resolveUserFromToken('token', [undefined]),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
