export interface PropertyImageKeys {
  largeKey: string;
  thumbKey: string;
}

/**
 * Builds the storage key pair for one uploaded image. Keys are relative and
 * adapter-agnostic (see `design.md`'s "Decision: Storage keys, URL scheme,
 * and StoragePort contract") and are stored on the row so the URL scheme
 * can evolve independently of the key format.
 */
export function buildPropertyImageKeys(
  propertyId: string,
  imageId: string,
): PropertyImageKeys {
  return {
    largeKey: `properties/${propertyId}/${imageId}-lg.webp`,
    thumbKey: `properties/${propertyId}/${imageId}-thumb.webp`,
  };
}

/** Directory prefix under which every rendition of a property's images lives. */
export function propertyMediaPrefix(propertyId: string): string {
  return `properties/${propertyId}/`;
}
