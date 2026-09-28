import { NeighborhoodsController } from './neighborhoods.controller';
import { META_ROLES } from '../auth/helpers/meta-helpers';
import { ValidRoles } from '../auth/interfaces';

describe('NeighborhoodsController', () => {
  it('carries role metadata [admin, manager] on the POST handler', () => {
    const roles = Reflect.getMetadata(
      META_ROLES,
      NeighborhoodsController.prototype.create,
    );

    expect(roles).toEqual([ValidRoles.admin, ValidRoles.manager]);
  });

  it('carries no role/guard metadata on the GET handler', () => {
    const roles = Reflect.getMetadata(
      META_ROLES,
      NeighborhoodsController.prototype.findAll,
    );
    const guards = Reflect.getMetadata(
      '__guards__',
      NeighborhoodsController.prototype.findAll,
    );

    expect(roles).toBeUndefined();
    expect(guards).toBeUndefined();
  });
});
