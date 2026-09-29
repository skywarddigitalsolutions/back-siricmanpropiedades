import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In } from 'typeorm';
import { PropertyImage } from '../entities/property-image.entity';

export interface NewPropertyImage {
  id: string;
  propertyId: string;
  largeKey: string;
  thumbKey: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  largeBytes: number;
  thumbBytes: number;
}

/** Signals a mutation targeted a property row that no longer exists. */
export class PropertyNotFoundError extends Error {
  constructor(public readonly propertyId: string) {
    super(`Property not found: ${propertyId}`);
    this.name = 'PropertyNotFoundError';
  }
}

/** Signals an upload would exceed the per-property image cap. */
export class ImageCapExceededError extends Error {
  constructor(
    public readonly propertyId: string,
    public readonly maxImages: number,
  ) {
    super(
      `Property ${propertyId} already has the maximum of ${maxImages} images`,
    );
    this.name = 'ImageCapExceededError';
  }
}

/**
 * Signals a reorder's `imageIds` is not an exact permutation (same length,
 * same set, no duplicates) of the property's current image ids.
 */
export class NotAPermutationError extends Error {
  constructor(public readonly propertyId: string) {
    super(
      `imageIds is not an exact permutation of property ${propertyId}'s current images`,
    );
    this.name = 'NotAPermutationError';
  }
}

const LOCK_PROPERTY_QUERY = 'SELECT 1 FROM properties WHERE id = $1 FOR UPDATE';

/**
 * All transactional SQL for `PropertyImage` in one place, per `design.md`'s
 * "Decision: (property_id, position) uniqueness". Every mutation (insert,
 * reorder, delete) first locks the parent `properties` row
 * (`SELECT ... FOR UPDATE`) inside one transaction, which serializes
 * concurrent image mutations of the same property and makes the 30-image
 * cap and position assignment race-free. Reorder and delete-compaction use
 * one set-based `UPDATE` statement each, relying on the migration's
 * `UNIQUE (property_id, position) DEFERRABLE INITIALLY IMMEDIATE`
 * constraint to allow a full permutation to commit without a mid-statement
 * unique violation.
 */
@Injectable()
export class PropertyImagesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async propertyExists(propertyId: string): Promise<boolean> {
    const rows = await this.dataSource.manager.query<unknown[]>(
      'SELECT 1 FROM properties WHERE id = $1',
      [propertyId],
    );
    return rows.length > 0;
  }

  async countByProperty(propertyId: string): Promise<number> {
    return this.dataSource.manager
      .getRepository(PropertyImage)
      .count({ where: { propertyId } });
  }

  /**
   * Locks the property row, re-checks the cap (authoritative, race-free
   * check — the service's own pre-check is only a cheap short-circuit),
   * then inserts the new row at `position = count`.
   */
  async insertAppended(
    image: NewPropertyImage,
    maxImages: number,
  ): Promise<PropertyImage> {
    return this.dataSource.transaction(async (manager) => {
      const lockRows = await manager.query<unknown[]>(LOCK_PROPERTY_QUERY, [
        image.propertyId,
      ]);
      if (lockRows.length === 0) {
        throw new PropertyNotFoundError(image.propertyId);
      }

      const imageRepository = manager.getRepository(PropertyImage);
      const count = await imageRepository.count({
        where: { propertyId: image.propertyId },
      });
      if (count >= maxImages) {
        throw new ImageCapExceededError(image.propertyId, maxImages);
      }

      const entity = imageRepository.create({ ...image, position: count });
      return imageRepository.save(entity);
    });
  }

  /**
   * Locks the property row, validates `imageIds` is an exact permutation of
   * the current image ids, and — unless the submitted order already matches
   * the current order (no-op, no write) — rewrites every position in one
   * `UPDATE ... FROM unnest(...) WITH ORDINALITY` statement.
   */
  async reorder(
    propertyId: string,
    imageIds: string[],
  ): Promise<PropertyImage[]> {
    return this.dataSource.transaction(async (manager) => {
      const lockRows = await manager.query<unknown[]>(LOCK_PROPERTY_QUERY, [
        propertyId,
      ]);
      if (lockRows.length === 0) {
        throw new PropertyNotFoundError(propertyId);
      }

      const imageRepository = manager.getRepository(PropertyImage);
      const current = await imageRepository.find({
        where: { propertyId },
        order: { position: 'ASC' },
      });
      const currentIds = current.map((row) => row.id);

      assertExactPermutation(propertyId, currentIds, imageIds);

      const isNoOp = currentIds.every((id, index) => id === imageIds[index]);
      if (isNoOp) {
        return current;
      }

      await manager.query(
        `UPDATE property_images AS pi SET position = v.ord - 1
         FROM unnest($1::uuid[]) WITH ORDINALITY AS v(id, ord)
         WHERE pi.id = v.id AND pi.property_id = $2`,
        [imageIds, propertyId],
      );

      return imageRepository.find({
        where: { propertyId },
        order: { position: 'ASC' },
      });
    });
  }

  /**
   * Locks the property row, finds the image scoped to that property
   * (`null` if it does not belong there or the property is gone), deletes
   * the row, then compacts the remaining positions in one `UPDATE`.
   */
  async deleteAndCompact(
    propertyId: string,
    imageId: string,
  ): Promise<PropertyImage | null> {
    return this.dataSource.transaction(async (manager) => {
      const lockRows = await manager.query<unknown[]>(LOCK_PROPERTY_QUERY, [
        propertyId,
      ]);
      if (lockRows.length === 0) {
        return null;
      }

      const imageRepository = manager.getRepository(PropertyImage);
      const image = await imageRepository.findOne({
        where: { id: imageId, propertyId },
      });
      if (!image) {
        return null;
      }

      await imageRepository.delete(imageId);

      await manager.query(
        `UPDATE property_images SET position = position - 1
         WHERE property_id = $1 AND position > $2`,
        [propertyId, image.position],
      );

      return image;
    });
  }

  findByPropertyId(propertyId: string): Promise<PropertyImage[]> {
    return this.dataSource.manager.getRepository(PropertyImage).find({
      where: { propertyId },
      order: { position: 'ASC' },
    });
  }

  findCoversByPropertyIds(ids: string[]): Promise<PropertyImage[]> {
    if (ids.length === 0) return Promise.resolve<PropertyImage[]>([]);
    const repository = this.dataSource.manager.getRepository(PropertyImage);
    const where: FindOptionsWhere<PropertyImage> = {
      propertyId: In(ids),
      position: 0,
    };
    return repository.find({ where });
  }
}

/**
 * Validates `submittedIds` is an exact permutation of `currentIds`: same
 * length, no duplicates, same set. All of "wrong length", "duplicate id",
 * "foreign id", and "missing id" are non-permutations and throw the same
 * `NotAPermutationError`.
 */
function assertExactPermutation(
  propertyId: string,
  currentIds: string[],
  submittedIds: string[],
): void {
  if (submittedIds.length !== currentIds.length) {
    throw new NotAPermutationError(propertyId);
  }

  const submittedSet = new Set(submittedIds);
  if (submittedSet.size !== submittedIds.length) {
    throw new NotAPermutationError(propertyId);
  }

  const currentSet = new Set(currentIds);
  for (const id of submittedIds) {
    if (!currentSet.has(id)) {
      throw new NotAPermutationError(propertyId);
    }
  }
}
