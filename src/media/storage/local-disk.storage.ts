import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { StoragePort } from './storage.port';
import { MEDIA_CONFIG, MediaConfig } from '../media.config';

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]*(\.webp)?$/;
const FILE_MODE = 0o644;
const DIR_MODE = 0o755;

/**
 * Filesystem-backed `StoragePort`. Keys are relative to the configured
 * `MEDIA_ROOT`; every key is validated and the resolved path is asserted to
 * stay inside the root before any filesystem operation (defense in depth —
 * keys are server-generated, never taken directly from client input).
 */
@Injectable()
export class LocalDiskStorage implements StoragePort, OnModuleInit {
  constructor(@Inject(MEDIA_CONFIG) private readonly config: MediaConfig) {}

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.config.root, { recursive: true, mode: DIR_MODE });
    const probePath = path.join(this.config.root, `.probe-${randomUUID()}`);
    try {
      await fs.writeFile(probePath, '');
    } catch (err) {
      throw new Error(
        `MEDIA_ROOT (${this.config.root}) is not writable: ${(err as Error).message}`,
      );
    }
    await fs.rm(probePath, { force: true });
  }

  // `contentType` is part of the `StoragePort` contract (kept for adapters
  // that need it, e.g. an S3/R2-backed one) but this filesystem adapter
  // does not use it: served files carry their type via the `.webp`
  // extension (Caddy) or Nest's static file serving, not a stored header.
  async put(
    key: string,
    data: Buffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contentType: string,
  ): Promise<void> {
    const target = this.resolveKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true, mode: DIR_MODE });

    const tempPath = `${target}.${randomUUID()}.tmp`;
    await fs.writeFile(tempPath, data, { mode: FILE_MODE });
    try {
      await fs.rename(tempPath, target);
    } catch (err) {
      await fs.rm(tempPath, { force: true });
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveKey(key);
    try {
      await fs.unlink(target);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    const segments = prefix.split('/').filter((segment) => segment.length > 0);
    if (segments.length < 2) {
      throw new Error(
        `deletePrefix requires at least two path segments, got: ${prefix}`,
      );
    }
    const target = this.resolveKey(segments.join('/'));
    await fs.rm(target, { recursive: true, force: true });
  }

  /** Validates the key and resolves it to an absolute path inside the root. */
  private resolveKey(key: string): string {
    if (!KEY_PATTERN.test(key)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    const resolved = path.resolve(this.config.root, key);
    const rootWithSep = this.config.root.endsWith(path.sep)
      ? this.config.root
      : this.config.root + path.sep;
    if (resolved !== this.config.root && !resolved.startsWith(rootWithSep)) {
      throw new Error(`Storage key escapes MEDIA_ROOT: ${key}`);
    }
    return resolved;
  }
}
