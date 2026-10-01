import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: { findOne: jest.Mock };
  let revokedTokenRepository: { findOne: jest.Mock };

  const buildConfigService = (secret: string) =>
    ({ get: jest.fn().mockReturnValue(secret) }) as unknown as ConfigService;

  beforeEach(() => {
    userRepository = { findOne: jest.fn() };
    revokedTokenRepository = { findOne: jest.fn() };

    strategy = new JwtStrategy(
      userRepository as any,
      revokedTokenRepository as any,
      buildConfigService('a-test-jwt-secret-of-at-least-32-characters'),
    );
  });

  it('refuses to start with a short JWT_SECRET or the .env.example placeholder', () => {
    expect(
      () =>
        new JwtStrategy(
          userRepository as any,
          revokedTokenRepository as any,
          buildConfigService('short-secret'),
        ),
    ).toThrow(/too weak/);

    expect(
      () =>
        new JwtStrategy(
          userRepository as any,
          revokedTokenRepository as any,
          buildConfigService('your_super_secret_jwt_key_change_in_production'),
        ),
    ).toThrow(/too weak/);
  });

  it('rejects any token that carries a scope (mfa_verify/mfa_setup), regardless of validity otherwise', async () => {
    await expect(
      strategy.validate({ id: 'user-1', jti: 'jti-1', scope: 'mfa_setup' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a revoked token', async () => {
    revokedTokenRepository.findOne.mockResolvedValue({ jti: 'jti-1' });

    await expect(
      strategy.validate({ id: 'user-1', jti: 'jti-1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the user no longer exists', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      strategy.validate({ id: 'user-1', jti: 'jti-1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive user', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: false });

    await expect(
      strategy.validate({ id: 'user-1', jti: 'jti-1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token issued before the last password change, keeps later ones', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    const changedAt = new Date('2026-10-01T12:00:00.500Z');
    const sec = Math.floor(changedAt.getTime() / 1000);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      isActive: true,
      passwordChangedAt: changedAt,
    });

    await expect(
      strategy.validate({ id: 'user-1', jti: 'j', iat: sec - 1 }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      strategy.validate({ id: 'user-1', jti: 'j', iat: sec }),
    ).resolves.toMatchObject({ id: 'user-1' });
  });

  it('returns the user for a valid, non-scoped, non-revoked token', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });

    const user = await strategy.validate({ id: 'user-1', jti: 'jti-1' });

    expect(user.id).toBe('user-1');
  });
});
