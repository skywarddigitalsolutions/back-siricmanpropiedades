import { ValidationPipe } from '@nestjs/common';
import { AccountController } from './account.controller';
import { ChangePasswordDto } from './dto/change-password.dto';
import { META_ROLES } from '../helpers/meta-helpers';

const THROTTLER_LIMIT_DEFAULT = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_DEFAULT = 'THROTTLER:TTLdefault';

describe('AccountController', () => {
  it.each(['changePassword', 'regenerateBackupCodes'] as const)(
    '%s needs any authenticated role and is throttled to 5/min',
    (method) => {
      const handler = AccountController.prototype[method];

      expect(Reflect.getMetadata('__guards__', handler)).toHaveLength(2);
      expect(Reflect.getMetadata(META_ROLES, handler)).toEqual([]);
      expect(Reflect.getMetadata(THROTTLER_LIMIT_DEFAULT, handler)).toBe(5);
      expect(Reflect.getMetadata(THROTTLER_TTL_DEFAULT, handler)).toBe(60_000);
    },
  );

  it('passes the bearer token to changePassword so it can be revoked', async () => {
    const service = {
      changePassword: jest.fn().mockResolvedValue({ token: 't' }),
    };
    const controller = new AccountController(service as any);
    const user = { id: 'u', userName: 'john' };
    const dto = { currentPassword: 'a', newPassword: 'b' };

    await controller.changePassword(dto, user as any, 'Bearer abc');

    expect(service.changePassword).toHaveBeenCalledWith(user, 'abc', dto);
  });
});

describe('ChangePasswordDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const asBody = { type: 'body' as const, metatype: ChangePasswordDto };

  it('accepts a policy-compliant new password with an optional code', async () => {
    await expect(
      pipe.transform(
        {
          currentPassword: 'Whatever',
          newPassword: 'NewPassword2',
          code: '123456',
        },
        asBody,
      ),
    ).resolves.toBeDefined();
  });

  it.each(['Ab1', 'alllowercase1', 'ALLUPPERCASE1', 'NoNumbersHere'])(
    'rejects the weak new password %s',
    async (newPassword) => {
      await expect(
        pipe.transform({ currentPassword: 'x', newPassword }, asBody),
      ).rejects.toThrow();
    },
  );
});
