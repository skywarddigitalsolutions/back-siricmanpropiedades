import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertyImagesService } from './property-images.service';
import {
  ImageCapExceededError,
  PropertyNotFoundError,
} from './property-images.repository';
import {
  InvalidImageError,
  UnsupportedImageFormatError,
} from '../../media/images/image-processing.errors';
import { ProcessedImage } from '../../media/images/image-processor.port';
import { MediaUrlBuilder } from '../../media/media-url.builder';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { PropertyImage } from '../entities/property-image.entity';

const PROPERTY_ID = 'a0000000-0000-4000-8000-000000000001';

function makeFakeRepository() {
  return {
    propertyExists: jest.fn().mockResolvedValue(true),
    countByProperty: jest.fn().mockResolvedValue(0),
    insertAppended: jest.fn(),
  };
}

function makeFakeStorage() {
  return {
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    deletePrefix: jest.fn().mockResolvedValue(undefined),
  };
}

function makeProcessedImage(): ProcessedImage {
  return {
    sourceFormat: 'jpeg',
    large: { data: Buffer.from('large'), width: 1920, height: 1080, bytes: 5 },
    thumb: { data: Buffer.from('thumb'), width: 480, height: 270, bytes: 5 },
  };
}

function makeFile(): Express.Multer.File {
  return { buffer: Buffer.from('source-bytes') } as Express.Multer.File;
}

function makeSavedImage(overrides: Partial<PropertyImage> = {}): PropertyImage {
  return {
    id: 'img-1',
    propertyId: PROPERTY_ID,
    position: 0,
    largeKey: `properties/${PROPERTY_ID}/img-1-lg.webp`,
    thumbKey: `properties/${PROPERTY_ID}/img-1-thumb.webp`,
    width: 1920,
    height: 1080,
    thumbWidth: 480,
    thumbHeight: 270,
    largeBytes: 5,
    thumbBytes: 5,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as PropertyImage;
}

describe('PropertyImagesService (upload)', () => {
  let repository: ReturnType<typeof makeFakeRepository>;
  let storage: ReturnType<typeof makeFakeStorage>;
  let processor: { process: jest.Mock };
  let auditLogService: { record: jest.Mock };
  let mediaUrlBuilder: MediaUrlBuilder;
  let service: PropertyImagesService;

  beforeEach(() => {
    repository = makeFakeRepository();
    storage = makeFakeStorage();
    processor = { process: jest.fn().mockResolvedValue(makeProcessedImage()) };
    auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    mediaUrlBuilder = {
      toUrl: (key: string) => `https://media.test/${key}`,
    } as MediaUrlBuilder;

    service = new PropertyImagesService(
      repository as any,
      processor,
      storage,
      mediaUrlBuilder,
      auditLogService as any,
    );
  });

  it('returns the mapped response and records the audit entry on the happy path', async () => {
    const saved = makeSavedImage();
    repository.insertAppended.mockResolvedValue(saved);

    const result = await service.upload(PROPERTY_ID, makeFile(), {
      id: 'user-1',
      userName: 'admin',
    });

    expect(result).toEqual({
      id: saved.id,
      position: saved.position,
      url: `https://media.test/${saved.largeKey}`,
      width: saved.width,
      height: saved.height,
      thumbnailUrl: `https://media.test/${saved.thumbKey}`,
      thumbnailWidth: saved.thumbWidth,
      thumbnailHeight: saved.thumbHeight,
      createdAt: saved.createdAt,
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      actor: { id: 'user-1', userName: 'admin' },
      action: AuditAction.PROPERTY_IMAGE_UPLOADED,
      entityType: 'property',
      entityId: PROPERTY_ID,
      metadata: {
        imageId: saved.id,
        position: saved.position,
        largeBytes: saved.largeBytes,
        thumbBytes: saved.thumbBytes,
      },
    });
  });

  it('surfaces a nonexistent property as NotFoundException without touching storage', async () => {
    repository.propertyExists.mockResolvedValue(false);

    await expect(
      service.upload(PROPERTY_ID, makeFile()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(processor.process).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('short-circuits the cap pre-check before the processor is ever invoked', async () => {
    repository.countByProperty.mockResolvedValue(30);

    await expect(
      service.upload(PROPERTY_ID, makeFile()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(processor.process).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('maps an undecodable-image processor error to BadRequestException and writes nothing', async () => {
    processor.process.mockRejectedValue(new InvalidImageError());

    await expect(
      service.upload(PROPERTY_ID, makeFile()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
    expect(repository.insertAppended).not.toHaveBeenCalled();
  });

  it('maps an unsupported-format processor error to BadRequestException', async () => {
    processor.process.mockRejectedValue(new UnsupportedImageFormatError('gif'));

    await expect(
      service.upload(PROPERTY_ID, makeFile()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes the first written key when the second put() fails, then rethrows', async () => {
    storage.put
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(service.upload(PROPERTY_ID, makeFile())).rejects.toThrow(
      'disk full',
    );

    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete.mock.calls[0][0]).toEqual(
      expect.stringContaining('-lg.webp'),
    );
    expect(repository.insertAppended).not.toHaveBeenCalled();
  });

  it('deletes both written keys when insertAppended rejects with PropertyNotFoundError', async () => {
    repository.insertAppended.mockRejectedValue(
      new PropertyNotFoundError(PROPERTY_ID),
    );

    await expect(
      service.upload(PROPERTY_ID, makeFile()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.delete).toHaveBeenCalledTimes(2);
  });

  it('deletes both written keys when insertAppended rejects with ImageCapExceededError', async () => {
    repository.insertAppended.mockRejectedValue(
      new ImageCapExceededError(PROPERTY_ID, 30),
    );

    await expect(
      service.upload(PROPERTY_ID, makeFile()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.delete).toHaveBeenCalledTimes(2);
  });

  it('still returns the successful response when AuditLogService.record() rejects', async () => {
    const saved = makeSavedImage({ id: 'img-2' });
    repository.insertAppended.mockResolvedValue(saved);
    auditLogService.record.mockRejectedValue(new Error('audit down'));

    const result = await service.upload(PROPERTY_ID, makeFile());

    expect(result.id).toBe('img-2');
  });
});
