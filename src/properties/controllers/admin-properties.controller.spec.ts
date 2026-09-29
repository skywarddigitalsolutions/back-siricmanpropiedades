import { AdminPropertiesController } from './admin-properties.controller';
import { META_ROLES } from '../../auth/helpers/meta-helpers';
import { ValidRoles } from '../../auth/interfaces';

describe('AdminPropertiesController', () => {
  it('carries class-level role metadata [admin, manager]', () => {
    const roles = Reflect.getMetadata(META_ROLES, AdminPropertiesController);

    expect(roles).toEqual([ValidRoles.admin, ValidRoles.manager]);
  });

  it('narrows DELETE /:id to admin-only via method-level role metadata', () => {
    const roles = Reflect.getMetadata(
      META_ROLES,
      AdminPropertiesController.prototype.remove,
    );

    expect(roles).toEqual([ValidRoles.admin]);
  });

  describe('GET /:id', () => {
    it('delegates to service.findOneWithImages(id)', async () => {
      const service = {
        findOneWithImages: jest.fn().mockResolvedValue({ id: 'property-1' }),
        findOne: jest.fn(),
      };
      const controller = new AdminPropertiesController(service as any);

      await controller.findOne('property-1');

      expect(service.findOneWithImages).toHaveBeenCalledWith('property-1');
      expect(service.findOne).not.toHaveBeenCalled();
    });
  });
});
