import { UnauthorizedException } from '@nestjs/common';
import { MfaController } from './mfa.controller';
import { LoginThrottleService } from '../login-throttle.service';

describe('MfaController.verify', () => {
  let mfaService: { verifyLoginCode: jest.Mock };
  let authService: {
    resolveUserFromToken: jest.Mock;
    logout: jest.Mock;
    buildSessionResponse: jest.Mock;
    clearPasswordFailures: jest.Mock;
  };
  let controller: MfaController;
  const user = { id: 'user-1', userName: 'john' };
  const dto = { mfaToken: 'mfa-token', code: '123456' };

  beforeEach(() => {
    mfaService = { verifyLoginCode: jest.fn() };
    authService = {
      resolveUserFromToken: jest.fn().mockResolvedValue(user),
      logout: jest.fn(),
      buildSessionResponse: jest.fn().mockReturnValue({ token: 'jwt' }),
      clearPasswordFailures: jest.fn(),
    };
    controller = new MfaController(
      mfaService as any,
      authService as any,
      new LoginThrottleService(),
    );
  });

  it('on success: revokes the mfaToken, clears password failures and returns the session', async () => {
    mfaService.verifyLoginCode.mockResolvedValue(true);

    const result = await controller.verify(dto, '1.1.1.1');

    expect(result).toEqual({ token: 'jwt' });
    expect(authService.logout).toHaveBeenCalledWith('mfa-token');
    expect(authService.clearPasswordFailures).toHaveBeenCalledWith(
      'john',
      '1.1.1.1',
    );
  });

  it('on a wrong code: 401 and the mfaToken is NOT revoked yet', async () => {
    mfaService.verifyLoginCode.mockResolvedValue(false);

    await expect(controller.verify(dto, '1.1.1.1')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('after 5 failures: revokes the mfaToken and rejects further attempts for that user, even from another IP', async () => {
    mfaService.verifyLoginCode.mockResolvedValue(false);

    for (let i = 0; i < 5; i++) {
      await expect(controller.verify(dto, '1.1.1.1')).rejects.toThrow(
        UnauthorizedException,
      );
    }
    expect(authService.logout).toHaveBeenCalledWith('mfa-token');

    mfaService.verifyLoginCode.mockClear();
    mfaService.verifyLoginCode.mockResolvedValue(true);
    await expect(controller.verify(dto, '9.9.9.9')).rejects.toMatchObject({
      status: 429,
    });
    // Ni siquiera se evalúa el código mientras dura el bloqueo.
    expect(mfaService.verifyLoginCode).not.toHaveBeenCalled();
  });

  it('a successful verification resets the MFA failure counter', async () => {
    mfaService.verifyLoginCode.mockResolvedValue(false);
    for (let i = 0; i < 4; i++) {
      await expect(controller.verify(dto, '1.1.1.1')).rejects.toThrow(
        UnauthorizedException,
      );
    }
    mfaService.verifyLoginCode.mockResolvedValue(true);
    await controller.verify(dto, '1.1.1.1');

    mfaService.verifyLoginCode.mockResolvedValue(false);
    for (let i = 0; i < 4; i++) {
      await expect(controller.verify(dto, '1.1.1.1')).rejects.toThrow(
        UnauthorizedException,
      );
    }
    expect(authService.logout).toHaveBeenCalledTimes(1); // solo el éxito
  });
});
