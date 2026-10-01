import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginUserDto } from './login-user.dto';

describe('LoginUserDto', () => {
  it('normalizes userName (lowercase + trim)', async () => {
    const dto = plainToInstance(LoginUserDto, {
      userName: '  Admin ',
      password: 'Password1',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.userName).toBe('admin');
  });

  it.each([1, true, null, { a: 1 }, ['admin']])(
    'rejects a non-string userName (%p) with a validation error instead of throwing',
    async (userName) => {
      const build = () =>
        plainToInstance(LoginUserDto, { userName, password: 'Password1' });

      expect(build).not.toThrow();
      const errors = await validate(build());
      expect(errors.some((e) => e.property === 'userName')).toBe(true);
    },
  );
});
