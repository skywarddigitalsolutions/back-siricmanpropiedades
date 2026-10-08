import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export const MANIFEST_FILE = '.demo-leads.json';
const USAGE = 'Usage: npm run demo:leads -- seed | remove';

export interface DemoLeadsManifest {
  createdAt: string;
  leadIds: string[];
  /** Temporary draft property of the "orphan" case, if it was not removed. */
  tempPropertyId: string | null;
}

export type DemoLeadsCommand = 'seed' | 'remove';

export function manifestPath(dir: string): string {
  return path.join(dir, MANIFEST_FILE);
}

export async function loadManifest(
  file: string,
): Promise<DemoLeadsManifest | null> {
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as DemoLeadsManifest;
  } catch {
    throw new Error(`The manifest ${file} is corrupt (invalid JSON)`);
  }
}

/** Atomic write (temp + rename) so a crash never leaves a half manifest. */
export async function saveManifest(
  file: string,
  manifest: DemoLeadsManifest,
): Promise<void> {
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(manifest, null, 2), 'utf8');
  await fs.rename(temp, file);
}

export function assertCanSeed(manifest: DemoLeadsManifest | null): void {
  if (manifest)
    throw new Error(
      `Demo leads are already loaded (${manifest.leadIds.length}, created ${manifest.createdAt}). Run "remove" first.`,
    );
}

/** Demo leads are fake data for the local dev database only. */
export function assertNotProduction(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production')
    throw new Error('demo:leads refuses to run with NODE_ENV=production');
}

export function parseArgs(args: string[]): DemoLeadsCommand {
  const [command] = args;
  if (command === 'seed' || command === 'remove') return command;
  throw new Error(USAGE);
}
