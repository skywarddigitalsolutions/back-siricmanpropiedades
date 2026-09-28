import { PartialType } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';

/**
 * `code`, `slug`, `publicationStatus`, `dealStatus`, and `firstPublishedAt`
 * are intentionally absent (same as `CreatePropertyDto`): status changes
 * only happen through the audited lifecycle verbs, and the identifiers are
 * always derived server-side.
 */
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}
