import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LocalDiskStorage } from './local-disk.storage';
import type { MediaConfig } from '../media.config';

function makeConfig(root: string): MediaConfig {
  return {
    root,
    publicBaseUrl: 'http://localhost:3000/media',
    serveStatic: false,
  };
}

describe('LocalDiskStorage', () => {
  let tempRoot: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'media-storage-'));
    storage = new LocalDiskStorage(makeConfig(tempRoot));
    await storage.onModuleInit();
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  describe('put', () => {
    it('creates parent directories and writes the exact content', async () => {
      const key = 'properties/prop-1/img-1-lg.webp';
      const content = Buffer.from('fake-webp-bytes');

      await storage.put(key, content, 'image/webp');

      const written = await fs.readFile(path.join(tempRoot, key));
      expect(written.equals(content)).toBe(true);
    });

    it('leaves no leftover temp files after a successful write', async () => {
      const key = 'properties/prop-2/img-1-lg.webp';

      await storage.put(key, Buffer.from('data'), 'image/webp');

      const entries = await fs.readdir(
        path.join(tempRoot, 'properties/prop-2'),
      );
      expect(entries).toEqual(['img-1-lg.webp']);
    });

    it('rejects a key containing a traversal segment', async () => {
      await expect(
        storage.put('properties/../etc/passwd', Buffer.from('x'), 'image/webp'),
      ).rejects.toThrow();
    });

    it('rejects an absolute-path key', async () => {
      await expect(
        storage.put('/etc/passwd', Buffer.from('x'), 'image/webp'),
      ).rejects.toThrow();
    });

    it('rejects a key with disallowed characters', async () => {
      await expect(
        storage.put('Properties/IMG.png', Buffer.from('x'), 'image/webp'),
      ).rejects.toThrow();
    });

    it('accepts a well-formed key ending in .webp', async () => {
      await expect(
        storage.put(
          'properties/prop-3/img-1-lg.webp',
          Buffer.from('x'),
          'image/webp',
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('removes an existing file', async () => {
      const key = 'properties/prop-4/img-1-lg.webp';
      await storage.put(key, Buffer.from('data'), 'image/webp');

      await storage.delete(key);

      await expect(fs.readFile(path.join(tempRoot, key))).rejects.toThrow();
    });

    it('is idempotent: deleting a missing file succeeds', async () => {
      await expect(
        storage.delete('properties/prop-5/does-not-exist.webp'),
      ).resolves.toBeUndefined();
    });

    it('rejects an invalid key', async () => {
      await expect(storage.delete('../escape.webp')).rejects.toThrow();
    });
  });

  describe('deletePrefix', () => {
    it('removes only the directory for that prefix', async () => {
      await storage.put(
        'properties/prop-6/img-1-lg.webp',
        Buffer.from('a'),
        'image/webp',
      );
      await storage.put(
        'properties/prop-7/img-1-lg.webp',
        Buffer.from('b'),
        'image/webp',
      );

      await storage.deletePrefix('properties/prop-6/');

      await expect(
        fs.access(path.join(tempRoot, 'properties/prop-6')),
      ).rejects.toThrow();
      await expect(
        fs.access(path.join(tempRoot, 'properties/prop-7')),
      ).resolves.toBeUndefined();
    });

    it('is idempotent: removing an already-removed prefix succeeds', async () => {
      await storage.deletePrefix('properties/prop-8/');

      await expect(
        storage.deletePrefix('properties/prop-8/'),
      ).resolves.toBeUndefined();
    });

    it('rejects a prefix with fewer than two path segments', async () => {
      await expect(storage.deletePrefix('properties')).rejects.toThrow();
      await expect(storage.deletePrefix('properties/')).rejects.toThrow();
    });
  });

  describe('onModuleInit', () => {
    it('throws when the configured root is unwritable', async () => {
      // A path nested under a regular (non-directory) file is unwritable on
      // every OS, including Windows, without relying on chmod semantics.
      const blockerFile = path.join(tempRoot, 'blocker-file');
      await fs.writeFile(blockerFile, 'not a directory');
      const unwritableRoot = path.join(blockerFile, 'media');

      const brokenStorage = new LocalDiskStorage(makeConfig(unwritableRoot));

      await expect(brokenStorage.onModuleInit()).rejects.toThrow();
    });
  });
});
