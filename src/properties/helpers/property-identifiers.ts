import { slugify } from '../../common/utils/slugify';

const CODE_PREFIX = 'SP-';
const SLUG_TITLE_MAX_LENGTH = 80;

/**
 * Formats the numeric value reserved from `property_code_seq` into the
 * human-readable `code` (`101` -> `'SP-101'`).
 */
export function formatPropertyCode(sequenceValue: number): string {
  return `${CODE_PREFIX}${sequenceValue}`;
}

/**
 * Derives the property slug from its title and code: slugify the title,
 * truncate to 80 characters, then append the lowercased code as a suffix.
 * The code suffix makes the slug unique by construction (no retry loop).
 */
export function buildPropertySlug(title: string, code: string): string {
  const truncatedTitleSlug = slugify(title).slice(0, SLUG_TITLE_MAX_LENGTH);
  return `${truncatedTitleSlug}-${code.toLowerCase()}`;
}
