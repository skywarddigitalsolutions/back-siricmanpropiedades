export const STORAGE_PORT = Symbol('STORAGE_PORT');

/**
 * Adapter-agnostic contract for writing/removing media files. Keys are
 * relative, forward-slash-separated paths (e.g. `properties/{id}/{id}-lg.webp`);
 * the adapter decides how they map onto its backing store.
 */
export interface StoragePort {
  put(key: string, data: Buffer, contentType: string): Promise<void>;

  /** Idempotent: deleting a key that does not exist is success, not an error. */
  delete(key: string): Promise<void>;

  /** Idempotent: removes everything under the given prefix. */
  deletePrefix(prefix: string): Promise<void>;
}
