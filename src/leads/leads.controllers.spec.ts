import { PublicLeadsController } from './public-leads.controller';
import { AdminLeadsController } from './admin-leads.controller';
import { META_ROLES } from '../auth/helpers/meta-helpers';
import { ValidRoles } from '../auth/interfaces';
import { LeadType } from './enums/lead.enums';

// @nestjs/throttler metadata keys (see admin-property-images.controller.spec.ts).
const THROTTLER_LIMIT_DEFAULT = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_DEFAULT = 'THROTTLER:TTLdefault';

describe('PublicLeadsController', () => {
  const dto = {
    type: LeadType.CONTACT,
    name: 'Ana',
    email: 'ana@mail.com',
  };

  it('is public and throttles submissions to 5 per minute', () => {
    const handler = PublicLeadsController.prototype.submit;

    expect(
      Reflect.getMetadata(META_ROLES, PublicLeadsController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata('__guards__', PublicLeadsController),
    ).toBeUndefined();
    expect(Reflect.getMetadata(THROTTLER_LIMIT_DEFAULT, handler)).toBe(5);
    expect(Reflect.getMetadata(THROTTLER_TTL_DEFAULT, handler)).toBe(60_000);
  });

  it('answers the same whether the lead was saved or dropped as spam', async () => {
    const service = { submit: jest.fn() };
    const controller = new PublicLeadsController(service as any);

    service.submit.mockResolvedValueOnce({ id: 'lead-1' });
    await expect(controller.submit(dto)).resolves.toEqual({ received: true });
    service.submit.mockResolvedValueOnce(null);
    await expect(controller.submit(dto)).resolves.toEqual({ received: true });
  });
});

describe('AdminLeadsController', () => {
  it('lets admins and managers use the inbox', () => {
    expect(Reflect.getMetadata(META_ROLES, AdminLeadsController)).toEqual([
      ValidRoles.admin,
      ValidRoles.manager,
    ]);
    expect(
      Reflect.getMetadata(META_ROLES, AdminLeadsController.prototype.update),
    ).toBeUndefined();
  });

  it('restricts deleting to admins', () => {
    expect(
      Reflect.getMetadata(META_ROLES, AdminLeadsController.prototype.remove),
    ).toEqual([ValidRoles.admin]);
  });
});
