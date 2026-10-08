import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  assertCanSeed,
  assertNotProduction,
  DemoLeadsManifest,
  loadManifest,
  manifestPath,
  parseArgs,
  saveManifest,
} from './demo-leads.helpers';

const manifest: DemoLeadsManifest = {
  createdAt: '2026-10-08T12:00:00.000Z',
  leadIds: ['a', 'b'],
  tempPropertyId: null,
};

describe('demo-leads helpers', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'demo-leads-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('keeps the manifest in <dir>/.demo-leads.json', () => {
    expect(manifestPath('/x')).toBe(path.join('/x', '.demo-leads.json'));
  });

  it('returns null without a manifest and round-trips one', async () => {
    const file = manifestPath(dir);
    expect(await loadManifest(file)).toBeNull();
    await saveManifest(file, manifest);
    expect(await loadManifest(file)).toEqual(manifest);
  });

  it('rejects a corrupt manifest', async () => {
    await fs.writeFile(manifestPath(dir), '{nope');
    await expect(loadManifest(manifestPath(dir))).rejects.toThrow(/manifest/i);
  });

  it('refuses to seed twice', () => {
    expect(() => assertCanSeed(null)).not.toThrow();
    expect(() => assertCanSeed(manifest)).toThrow(/remove/);
  });

  it('refuses to run in production only', () => {
    expect(() => assertNotProduction('production')).toThrow(/production/);
    expect(() => assertNotProduction('development')).not.toThrow();
    expect(() => assertNotProduction(undefined)).not.toThrow();
  });

  it('parses the subcommand', () => {
    expect(parseArgs(['seed'])).toBe('seed');
    expect(parseArgs(['remove'])).toBe('remove');
    expect(() => parseArgs([])).toThrow(/Usage/);
    expect(() => parseArgs(['nuke'])).toThrow(/Usage/);
  });
});
