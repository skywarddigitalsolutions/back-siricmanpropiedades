import { PublicPropertiesController } from './public-properties.controller';
import { META_ROLES } from '../../auth/helpers/meta-helpers';

// @nestjs/throttler stores its metadata under these literal keys + the
// throttler name ('default'), see admin-property-images.controller.spec.ts.
const THROTTLER_LIMIT_DEFAULT = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_DEFAULT = 'THROTTLER:TTLdefault';

describe('PublicPropertiesController', () => {
  it('carries the 300/min public read throttle at the class level', () => {
    expect(
      Reflect.getMetadata(THROTTLER_LIMIT_DEFAULT, PublicPropertiesController),
    ).toBe(300);
    expect(
      Reflect.getMetadata(THROTTLER_TTL_DEFAULT, PublicPropertiesController),
    ).toBe(60_000);
  });

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
