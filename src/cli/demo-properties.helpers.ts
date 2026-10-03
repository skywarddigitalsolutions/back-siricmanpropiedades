import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export const MANIFEST_FILE = '.demo-properties.json';
export const MAX_PHOTOS_PER_PROPERTY = 8;

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const USAGE =
  'Uso: node dist/cli/demo-properties.js seed <carpetaDeFotos> | remove';

export interface SequenceState {
  lastValue: number;
  isCalled: boolean;
}

export interface DemoManifest {
  createdAt: string;
  sequenceBefore: SequenceState;
  properties: Array<{ id: string; code: string }>;
}

export type DemoCommand =
  { command: 'seed'; photosDir: string } | { command: 'remove' };

/** The manifest sits in the media volume; Caddy only serves `*.webp`. */
export function manifestPath(mediaRoot: string): string {
  return path.join(mediaRoot, MANIFEST_FILE);
}

export async function loadManifest(file: string): Promise<DemoManifest | null> {
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as DemoManifest;
  } catch {
    throw new Error(`El manifiesto ${file} está corrupto (JSON inválido)`);
  }
}

/** Atomic write (temp + rename) so a crash never leaves a half manifest. */
export async function saveManifest(
  file: string,
  manifest: DemoManifest,
): Promise<void> {
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(manifest, null, 2), 'utf8');
  await fs.rename(temp, file);
}

export function assertCanSeed(manifest: DemoManifest | null): void {
  if (manifest)
    throw new Error(
      `Ya hay propiedades de demostración cargadas (${manifest.properties.length}, creadas ${manifest.createdAt}). Corré "remove" antes de volver a cargar.`,
    );
}

export function assertCanRemove(manifest: DemoManifest | null): DemoManifest {
  if (!manifest)
    throw new Error(
      'No hay manifiesto de demostración: no hay nada para borrar (¿nunca se corrió "seed"?).',
    );
  return manifest;
}

/**
 * Value for `setval('property_code_seq', value, isCalled)` after the demo
 * properties are gone: the highest remaining numeric code with
 * `is_called = true` (next nextval = max + 1), or the pre-seed state when no
 * property remains.
 */
export function computeSequenceReset(
  remainingCodes: string[],
  before: SequenceState,
): SequenceState {
  const numbers = remainingCodes
    .map((code) => /(\d+)$/.exec(code)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number);
  if (numbers.length === 0) return before;
  return { lastValue: Math.max(...numbers), isCalled: true };
}

/** Image files of a folder, by name, jpg/jpeg/png/webp only, capped. */
export function selectImageFiles(
  fileNames: string[],
  max = MAX_PHOTOS_PER_PROPERTY,
): string[] {
  return fileNames
    .filter(
      (name) =>
        !name.startsWith('.') &&
        IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()),
    )
    .sort()
    .slice(0, max);
}

export function parseArgs(args: string[]): DemoCommand {
  const [command, photosDir] = args;
  if (command === 'seed' && photosDir) return { command, photosDir };
  if (command === 'remove') return { command };
  throw new Error(USAGE);
}
