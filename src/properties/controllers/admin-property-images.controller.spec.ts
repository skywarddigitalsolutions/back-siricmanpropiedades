import { BadRequestException } from '@nestjs/common';
import {
  AdminPropertyImagesController,
  IMAGE_UPLOAD_LIMITS,
} from './admin-property-images.controller';
import { META_ROLES } from '../../auth/helpers/meta-helpers';
import { ValidRoles } from '../../auth/interfaces';
import { User } from '../../users/entities/user.entity';

// @nestjs/throttler stores its per-handler metadata under these two literal
// keys concatenated with the throttler name ('default' here) — see
// node_modules/@nestjs/throttler/dist/throttler.constants.js /
// throttler.decorator.js. Hardcoded here instead of importing the package's
// internal (non-public) module path.
const THROTTLER_LIMIT_DEFAULT = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_DEFAULT = 'THROTTLER:TTLdefault';

function makeActor(): User {
  return { id: 'user-1', userName: 'admin' } as User;
}

describe('AdminPropertyImagesController', () => {
  let service: {
    upload: jest.Mock;
    reorder: jest.Mock;
    delete: jest.Mock;
  };
  let controller: AdminPropertyImagesController;

  beforeEach(() => {
    service = {
      upload: jest.fn().mockResolvedValue({ id: 'img-1' }),
      reorder: jest.fn().mockResolvedValue([{ id: 'img-1' }]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    controller = new AdminPropertyImagesController(service as any);
  });

  it('carries class-level role metadata [admin, manager] and no per-method override', () => {
    const classRoles = Reflect.getMetadata(
      META_ROLES,
      AdminPropertyImagesController,
    );
    const methodRoles = Reflect.getMetadata(
      META_ROLES,
      AdminPropertyImagesController.prototype.upload,
    );

    expect(classRoles).toEqual([ValidRoles.admin, ValidRoles.manager]);
    expect(methodRoles).toBeUndefined();
  });

  it('carries a 60/min throttle on the upload handler', () => {
    const limit = Reflect.getMetadata(
      THROTTLER_LIMIT_DEFAULT,
      AdminPropertyImagesController.prototype.upload,
    );
    const ttl = Reflect.getMetadata(
      THROTTLER_TTL_DEFAULT,
      AdminPropertyImagesController.prototype.upload,
    );

    expect(limit).toBe(60);
    expect(ttl).toBe(60_000);
  });

  it('exports IMAGE_UPLOAD_LIMITS matching the 15 MiB / 1-file multer contract', () => {
    // parts: 2, not 1 — see the deviation comment on IMAGE_UPLOAD_LIMITS:
    // busboy counts 2 boundary occurrences for a single-file request, so
    // parts: 1 rejects every legitimate single-file upload.
    expect(IMAGE_UPLOAD_LIMITS).toEqual({
      fileSize: 15 * 1024 * 1024,
      files: 1,
      fields: 0,
      parts: 2,
    });
  });

  it('rejects a missing file part with 400', () => {
    expect(() =>
      controller.upload(
        'a0000000-0000-4000-8000-000000000001',
        undefined,
        makeActor(),
      ),
    ).toThrow(BadRequestException);
    expect(service.upload).not.toHaveBeenCalled();
  });

  it('delegates to service.upload(propertyId, file, actor)', async () => {
    const file = { buffer: Buffer.from('x') } as Express.Multer.File;
    const propertyId = 'a0000000-0000-4000-8000-000000000001';

    await controller.upload(propertyId, file, makeActor());

    expect(service.upload).toHaveBeenCalledWith(propertyId, file, {
      id: 'user-1',
      userName: 'admin',
    });
  });

  describe('PUT order', () => {
    const propertyId = 'a0000000-0000-4000-8000-000000000001';

    it('delegates to service.reorder(id, imageIds, actor)', async () => {
      const imageIds = [
        'a0000000-0000-4000-8000-000000000010',
        'a0000000-0000-4000-8000-000000000011',
      ];

      await controller.reorder(propertyId, { imageIds }, makeActor());

      expect(service.reorder).toHaveBeenCalledWith(propertyId, imageIds, {
        id: 'user-1',
        userName: 'admin',
      });
    });

    it('keeps the global 20/min throttle — no @Throttle override on the handler', () => {
      const limit = Reflect.getMetadata(
        THROTTLER_LIMIT_DEFAULT,
        AdminPropertyImagesController.prototype.reorder,
      );

      expect(limit).toBeUndefined();
    });
  });

  describe('DELETE :imageId', () => {
    const propertyId = 'a0000000-0000-4000-8000-000000000001';
    const imageId = 'a0000000-0000-4000-8000-000000000099';

    it('delegates to service.delete(id, imageId, actor)', async () => {
      await controller.remove(propertyId, imageId, makeActor());

      expect(service.delete).toHaveBeenCalledWith(propertyId, imageId, {
        id: 'user-1',
        userName: 'admin',
      });
    });

    it('carries a 60/min throttle matching the upload route', () => {
      const limit = Reflect.getMetadata(
        THROTTLER_LIMIT_DEFAULT,
        AdminPropertyImagesController.prototype.remove,
      );
      const ttl = Reflect.getMetadata(
        THROTTLER_TTL_DEFAULT,
        AdminPropertyImagesController.prototype.remove,
      );

      expect(limit).toBe(60);
      expect(ttl).toBe(60_000);
    });
  });
});
