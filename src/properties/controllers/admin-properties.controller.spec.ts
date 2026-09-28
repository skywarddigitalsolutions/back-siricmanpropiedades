import { AdminPropertiesController } from './admin-properties.controller';
import { META_ROLES } from '../../auth/helpers/meta-helpers';
import { ValidRoles } from '../../auth/interfaces';

describe('AdminPropertiesController', () => {
  it('carries class-level role metadata [admin, manager]', () => {
    const roles = Reflect.getMetadata(META_ROLES, AdminPropertiesController);

    expect(roles).toEqual([ValidRoles.admin, ValidRoles.manager]);
  });
});
