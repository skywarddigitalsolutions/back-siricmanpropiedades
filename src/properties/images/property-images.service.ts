import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ImageCapExceededError,
  PropertyImagesRepository,
  PropertyNotFoundError,
} from './property-images.repository';
import { buildPropertyImageKeys } from './property-image-keys';
import { STORAGE_PORT } from '../../media/storage/storage.port';
import type { StoragePort } from '../../media/storage/storage.port';
import { IMAGE_PROCESSOR } from '../../media/images/image-processor.port';
import type {
  ImageProcessor,
  ProcessedImage,
} from '../../media/images/image-processor.port';
import {
  ImageTooLargeError,
  InvalidImageError,
  UnsupportedImageFormatError,
} from '../../media/images/image-processing.errors';
import { MediaUrlBuilder } from '../../media/media-url.builder';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditActor } from '../../audit/interfaces/audit-actor.interface';
import {
  PropertyImageResponse,
  toPropertyImageResponse,
} from '../helpers/property-image.mapper';

/** Per-property upload cap; the 31st image on a property is rejected. */
export const MAX_IMAGES_PER_PROPERTY = 30;

const WEBP_CONTENT_TYPE = 'image/webp';

/**
 * Upload orchestration per design.md's "Decision: Upload order — process,
 * write files, then locked insert with compensation": existence + cheap
 * cap pre-check, process, write both renditions, locked authoritative
 * insert (compensating both files on any failure), safe audit, map
 * response. Reorder/delete are added in Phase 5.
 */
@Injectable()
export class PropertyImagesService {
  private readonly logger = new Logger(PropertyImagesService.name);

  constructor(
    private readonly propertyImagesRepository: PropertyImagesRepository,
    @Inject(IMAGE_PROCESSOR) private readonly imageProcessor: ImageProcessor,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly mediaUrlBuilder: MediaUrlBuilder,
    private readonly auditLogService: AuditLogService,
  ) {}

  async upload(
    propertyId: string,
    file: Express.Multer.File,
    actor?: AuditActor,
  ): Promise<PropertyImageResponse> {
    const exists =
      await this.propertyImagesRepository.propertyExists(propertyId);
    if (!exists) throw new NotFoundException('Property not found');

    const count =
      await this.propertyImagesRepository.countByProperty(propertyId);
    if (count >= MAX_IMAGES_PER_PROPERTY) {
      throw new BadRequestException(
        `Property already has the maximum of ${MAX_IMAGES_PER_PROPERTY} images`,
      );
    }

    const processed = await this.processImage(file.buffer);

    const imageId = randomUUID();
    const { largeKey, thumbKey } = buildPropertyImageKeys(propertyId, imageId);

    await this.storage.put(largeKey, processed.large.data, WEBP_CONTENT_TYPE);
    try {
      await this.storage.put(thumbKey, processed.thumb.data, WEBP_CONTENT_TYPE);
    } catch (err) {
      await this.deleteKeys([largeKey]);
      throw err;
    }

    const saved = await this.insertAppendedWithCompensation(
      propertyId,
      imageId,
      largeKey,
      thumbKey,
      processed,
    );

    await this.auditLogService
      .record({
        actor,
        action: AuditAction.PROPERTY_IMAGE_UPLOADED,
        entityType: 'property',
        entityId: propertyId,
        metadata: {
          imageId: saved.id,
          position: saved.position,
          largeBytes: saved.largeBytes,
          thumbBytes: saved.thumbBytes,
        },
      })
      .catch(() => undefined);

    return toPropertyImageResponse(saved, this.mediaUrlBuilder);
  }

  private async insertAppendedWithCompensation(
    propertyId: string,
    imageId: string,
    largeKey: string,
    thumbKey: string,
    processed: ProcessedImage,
  ) {
    try {
      return await this.propertyImagesRepository.insertAppended(
        {
          id: imageId,
          propertyId,
          largeKey,
          thumbKey,
          width: processed.large.width,
          height: processed.large.height,
          thumbWidth: processed.thumb.width,
          thumbHeight: processed.thumb.height,
          largeBytes: processed.large.bytes,
          thumbBytes: processed.thumb.bytes,
        },
        MAX_IMAGES_PER_PROPERTY,
      );
    } catch (err) {
      await this.deleteKeys([largeKey, thumbKey]);
      if (err instanceof PropertyNotFoundError) {
        throw new NotFoundException('Property not found');
      }
      if (err instanceof ImageCapExceededError) {
        throw new BadRequestException(
          `Property already has the maximum of ${MAX_IMAGES_PER_PROPERTY} images`,
        );
      }
      throw err;
    }
  }

  private async processImage(buffer: Buffer): Promise<ProcessedImage> {
    try {
      return await this.imageProcessor.process(buffer);
    } catch (err) {
      if (
        err instanceof InvalidImageError ||
        err instanceof UnsupportedImageFormatError ||
        err instanceof ImageTooLargeError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  private async deleteKeys(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((key) =>
        this.storage.delete(key).catch((err: unknown) => {
          this.logger.warn(
            `Failed to delete compensation key "${key}": ${(err as Error).message}`,
          );
        }),
      ),
    );
  }
}
