import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  assertCanSeed,
  assertCanRemove,
  computeSequenceReset,
  DemoManifest,
  loadManifest,
  manifestPath,
  parseArgs,
  saveManifest,
  selectImageFiles,
} from './demo-properties.helpers';

const manifest: DemoManifest = {
  createdAt: '2026-10-02T12:00:00.000Z',
  sequenceBefore: { lastValue: 101, isCalled: false },
  properties: [{ id: 'a', code: 'SP-101' }],
};

describe('manifest', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'demo-manifest-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('lives at <mediaRoot>/.demo-properties.json', () => {
    expect(manifestPath('/m')).toBe(path.join('/m', '.demo-properties.json'));
  });

  it('returns null when there is no manifest', async () => {
    expect(await loadManifest(manifestPath(dir))).toBeNull();
  });

  it('round-trips a manifest', async () => {
    await saveManifest(manifestPath(dir), manifest);
    expect(await loadManifest(manifestPath(dir))).toEqual(manifest);
  });

  it('rejects a corrupt manifest', async () => {
    await fs.writeFile(manifestPath(dir), '{nope');
    await expect(loadManifest(manifestPath(dir))).rejects.toThrow(
      /manifiesto/i,
    );
  });

  it('refuses to seed when a manifest exists, and to remove without one', () => {
    expect(() => assertCanSeed(manifest)).toThrow(/remove/);
    expect(() => assertCanSeed(null)).not.toThrow();
    expect(() => assertCanRemove(null)).toThrow(/seed/);
    expect(assertCanRemove(manifest)).toBe(manifest);
  });
});

describe('computeSequenceReset', () => {
  const before = { lastValue: 101, isCalled: false };

  it('points at the highest remaining code so next is max + 1', () => {
    expect(
      computeSequenceReset(['SP-101', 'SP-107', 'SP-103'], before),
    ).toEqual({ lastValue: 107, isCalled: true });
  });

  it('restores the pre-seed state when nothing remains', () => {
    expect(computeSequenceReset([], before)).toEqual({
      lastValue: 101,
      isCalled: false,
    });
  });

  it('ignores codes without a numeric part', () => {
    expect(computeSequenceReset(['xx'], before)).toEqual({
      lastValue: 101,
      isCalled: false,
    });
  });
});

describe('selectImageFiles', () => {
  it('keeps jpg/jpeg/png/webp sorted by name, case-insensitive', () => {
    expect(
      selectImageFiles([
        'b.PNG',
        'a.jpg',
        'notes.txt',
        'c.webp',
        'd.jpeg',
        '.DS_Store',
      ]),
    ).toEqual(['a.jpg', 'b.PNG', 'c.webp', 'd.jpeg']);
  });

  it('caps at 8 files', () => {
    const names = Array.from(
      { length: 12 },
      (_, i) => `${String(i + 1).padStart(2, '0')}.jpg`,
    );
    expect(selectImageFiles(names)).toEqual(names.slice(0, 8));
  });
});

describe('parseArgs', () => {
  it('parses seed with a photos dir and remove', () => {
    expect(parseArgs(['seed', '/p'])).toEqual({
      command: 'seed',
      photosDir: '/p',
    });
    expect(parseArgs(['remove'])).toEqual({ command: 'remove' });
  });

  it('throws usage otherwise', () => {
    expect(() => parseArgs([])).toThrow(/Uso/);
    expect(() => parseArgs(['seed'])).toThrow(/Uso/);
    expect(() => parseArgs(['x'])).toThrow(/Uso/);
  });
});
