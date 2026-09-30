import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { UserRoleGuard } from './guards/user-role/user-role.guard';
import { META_ROLES } from './helpers/meta-helpers';

describe('AuthController', () => {
  describe('GET /me', () => {
    it('is guarded by AuthGuard(jwt) and UserRoleGuard, with no role restriction', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.me,
      );

      expect(guards).toHaveLength(2);
      expect(guards[0]).toBe(AuthGuard('jwt'));
      expect(guards[1]).toBe(UserRoleGuard);

      const roles = Reflect.getMetadata(
        META_ROLES,
        AuthController.prototype.me,
      );
      expect(roles).toEqual([]);
    });

    it('delegates to authService.toSessionUser(user) and returns its result', () => {
      const sessionUser = {
        id: 'user-id',
        userName: 'john',
        isActive: true,
        roles: ['admin'],
      };
      const authService = {
        toSessionUser: jest.fn().mockReturnValue(sessionUser),
        logout: jest.fn(),
        checkAuthStatus: jest.fn(),
      };
      const controller = new AuthController(authService as any);
      const user = { id: 'user-id' } as any;

      const result = controller.me(user);

      expect(authService.toSessionUser).toHaveBeenCalledWith(user);
      expect(result).toBe(sessionUser);
      expect(authService.logout).not.toHaveBeenCalled();
      expect(authService.checkAuthStatus).not.toHaveBeenCalled();
    });
  });
});
