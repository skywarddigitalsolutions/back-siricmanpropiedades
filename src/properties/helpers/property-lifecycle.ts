import { BadRequestException } from '@nestjs/common';
import { PublicationStatus } from '../enums/property.enums';

export type PublicationAction = 'publish' | 'archive' | 'unpublish';

/**
 * The reconciled publication transition matrix (`design.md` → Decision:
 * Publication transition matrix): only these `(from, action)` combinations
 * are allowed. Every other combination, including same-state, is a 400.
 */
const TRANSITIONS: Record<
  PublicationAction,
  Partial<Record<PublicationStatus, PublicationStatus>>
> = {
  publish: {
    [PublicationStatus.DRAFT]: PublicationStatus.PUBLISHED,
    [PublicationStatus.ARCHIVED]: PublicationStatus.PUBLISHED,
  },
  archive: {
    [PublicationStatus.DRAFT]: PublicationStatus.ARCHIVED,
    [PublicationStatus.PUBLISHED]: PublicationStatus.ARCHIVED,
  },
  unpublish: {
    [PublicationStatus.PUBLISHED]: PublicationStatus.DRAFT,
    [PublicationStatus.ARCHIVED]: PublicationStatus.DRAFT,
  },
};

/**
 * Validates a publication transition against the reconciled matrix and
 * returns the resulting `PublicationStatus`. Throws `BadRequestException`
 * naming the current status when the `(from, action)` pair is not allowed.
 */
export function assertPublicationTransition(
  from: PublicationStatus,
  action: PublicationAction,
): PublicationStatus {
  const to = TRANSITIONS[action][from];
  if (!to)
    throw new BadRequestException(
      `Cannot ${action} a property with publicationStatus "${from}"`,
    );
  return to;
}
