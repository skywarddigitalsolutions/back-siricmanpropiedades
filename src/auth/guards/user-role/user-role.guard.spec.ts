import { Reflector } from '@nestjs/core';
import {
  BadRequestException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { UserRoleGuard } from './user-role.guard';

describe('UserRoleGuard', () => {
  let guard: UserRoleGuard;
  let reflector: { get: jest.Mock };

  const createContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new UserRoleGuard(reflector as unknown as Reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.get.mockReturnValue(undefined);

    expect(
      guard.canActivate(createContext({ userName: 'john', userRoles: [] })),
    ).toBe(true);
  });

  it('throws when there is no user in the request', () => {
    reflector.get.mockReturnValue(['admin']);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      BadRequestException,
    );
  });

  it('throws when the user has no roles assigned', () => {
    reflector.get.mockReturnValue(['admin']);

    expect(() =>
      guard.canActivate(createContext({ userName: 'john', userRoles: null })),
    ).toThrow(ForbiddenException);
  });

  it('allows access when one of the user roles matches', () => {
    reflector.get.mockReturnValue(['admin', 'manager']);

    const result = guard.canActivate(
      createContext({
        userName: 'john',
        userRoles: [{ role: { name: 'user' } }, { role: { name: 'manager' } }],
      }),
    );

    expect(result).toBe(true);
  });

  it('denies access when none of the user roles match', () => {
    reflector.get.mockReturnValue(['admin']);

    expect(() =>
      guard.canActivate(
        createContext({
          userName: 'john',
          userRoles: [{ role: { name: 'user' } }],
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
