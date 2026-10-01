import { DashboardController } from './dashboard.controller';
import { META_ROLES } from '../auth/helpers/meta-helpers';
import { ValidRoles } from '../auth/interfaces';

describe('DashboardController', () => {
  it('is for admins and managers only', () => {
    expect(Reflect.getMetadata(META_ROLES, DashboardController)).toEqual([
      ValidRoles.admin,
      ValidRoles.manager,
    ]);
    expect(Reflect.getMetadata('path', DashboardController)).toBe(
      'admin/dashboard',
    );
  });
});
