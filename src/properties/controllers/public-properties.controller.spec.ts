import { PublicPropertiesController } from './public-properties.controller';
import { META_ROLES } from '../../auth/helpers/meta-helpers';

describe('PublicPropertiesController', () => {
  it('carries no role/guard metadata at the class level', () => {
    const roles = Reflect.getMetadata(META_ROLES, PublicPropertiesController);
    const guards = Reflect.getMetadata(
      '__guards__',
      PublicPropertiesController,
    );

    expect(roles).toBeUndefined();
    expect(guards).toBeUndefined();
  });
});
