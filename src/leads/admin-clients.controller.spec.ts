import { AdminClientsController } from './admin-clients.controller';
import { META_ROLES } from '../auth/helpers/meta-helpers';
import { ValidRoles } from '../auth/interfaces';

describe('AdminClientsController', () => {
  it('lets admins and managers use the clients view', () => {
    expect(Reflect.getMetadata(META_ROLES, AdminClientsController)).toEqual([
      ValidRoles.admin,
      ValidRoles.manager,
    ]);
    expect(
      Reflect.getMetadata('__guards__', AdminClientsController),
    ).toHaveLength(2);
  });

  it('serves the export as a UTF-8 CSV attachment', async () => {
    const service = { exportCsv: jest.fn().mockResolvedValue('﻿a\r\n') };
    const controller = new AdminClientsController(service as any);
    const handler = AdminClientsController.prototype.exportCsv;

    expect(Reflect.getMetadata('__headers__', handler)).toEqual(
      expect.arrayContaining([
        { name: 'Content-Type', value: 'text/csv; charset=utf-8' },
      ]),
    );
    await expect(
      controller.exportCsv({ q: 'x' }, { id: 'u', userName: 'g' } as any),
    ).resolves.toBe('﻿a\r\n');
    expect(service.exportCsv).toHaveBeenCalledWith(
      { q: 'x' },
      { id: 'u', userName: 'g' },
    );
  });
});
