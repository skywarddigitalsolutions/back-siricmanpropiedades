import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Property } from './property.entity';

/**
 * A single uploaded photo for a property, stored as two WebP renditions
 * (`large`/`thumb`). `id` is app-generated (`randomUUID()`, not
 * `uuid_generate_v4()`) because the storage keys embed it before the row
 * exists (see `buildPropertyImageKeys`). `Property` intentionally has no
 * inverse `images` relation — see `design.md`'s "Decision: No inverse
 * OneToMany relation on Property" — so images are always loaded through
 * `PropertyImagesRepository`'s explicit queries, never via `save()` cascade.
 *
 * `position` uniqueness within a property, the `position >= 0` check, and
 * the cascading FK are enforced by migration
 * `1790500000002-CreatePropertyImages`, which is the schema source of
 * truth (`synchronize` is off).
 */
@Entity({ name: 'property_images' })
export class PropertyImage {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @Column({ type: 'smallint' })
  position: number;

  @Column({ name: 'large_key', type: 'varchar', length: 255 })
  largeKey: string;

  @Column({ name: 'thumb_key', type: 'varchar', length: 255 })
  thumbKey: string;

  @Column({ type: 'integer' })
  width: number;

  @Column({ type: 'integer' })
  height: number;

  @Column({ name: 'thumb_width', type: 'integer' })
  thumbWidth: number;

  @Column({ name: 'thumb_height', type: 'integer' })
  thumbHeight: number;

  @Column({ name: 'large_bytes', type: 'integer' })
  largeBytes: number;

  @Column({ name: 'thumb_bytes', type: 'integer' })
  thumbBytes: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
    default: () => 'now()',
  })
  createdAt: Date;
}
