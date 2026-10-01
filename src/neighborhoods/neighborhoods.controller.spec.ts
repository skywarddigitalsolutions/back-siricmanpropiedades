import { NeighborhoodsController } from './neighborhoods.controller';
import { META_ROLES } from '../auth/helpers/meta-helpers';
import { ValidRoles } from '../auth/interfaces';

const THROTTLER_LIMIT_DEFAULT = 'THROTTLER:LIMITdefault';

describe('NeighborhoodsController', () => {
  it('carries the 300/min public read throttle on the GET handler only', () => {
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT_DEFAULT,
        NeighborhoodsController.prototype.findAll,
      ),
    ).toBe(300);
    expect(
      Reflect.getMetadata(
        THROTTLER_LIMIT_DEFAULT,
        NeighborhoodsController.prototype.create,
      ),
    ).toBeUndefined();
  });

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
