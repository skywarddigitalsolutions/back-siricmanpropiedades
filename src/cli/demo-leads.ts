/**
 * Dev-only command: loads or removes fake leads that exercise the admin
 * inbox (every category, every status, a lead whose property was deleted and
 * a client without property inquiries).
 *
 *   npm run demo:leads -- seed
 *   npm run demo:leads -- remove
 *
 * Writes straight through TypeORM (no throttled public endpoint) and keeps a
 * manifest (`.demo-leads.json`, gitignored) so `remove` deletes exactly what
 * `seed` created. Refuses to run with NODE_ENV=production.
 */
import 'reflect-metadata';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import { DataSource } from 'typeorm';
import { Lead } from '../leads/entities/lead.entity';
import { Neighborhood } from '../neighborhoods/entities/neighborhood.entity';
import { Property } from '../properties/entities/property.entity';
import { leadCategoryOf } from '../leads/helpers/lead-category';
import { createdAtFor, DEMO_LEADS } from './demo-leads.fixture';
import {
  assertCanSeed,
  assertNotProduction,
  DemoLeadsManifest,
  loadManifest,
  manifestPath,
  parseArgs,
  saveManifest,
} from './demo-leads.helpers';

function env(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

async function createDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: env('DB_HOST', 'localhost'),
    port: Number(env('DB_PORT', '5432')),
    username: env('DB_USER'),
    password: env('DB_PASSWORD'),
    database: env('DB_NAME'),
    entities: [Lead, Property, Neighborhood],
    synchronize: false,
  });
  return dataSource.initialize();
}

/** Minimal valid DRAFT property, never published; deleted right away. */
async function insertTempDraft(
  dataSource: DataSource,
  id: string,
): Promise<boolean> {
  const rows: Array<{ id: string }> = await dataSource.query(
    'SELECT id FROM neighborhoods ORDER BY name LIMIT 1',
  );
  if (rows.length === 0) return false;
  const suffix = id.slice(0, 8);
  await dataSource.query(
    `INSERT INTO properties (id, code, slug, operation, type, title, neighborhood_id,
       address, currency, price, rooms, bedrooms, bathrooms, covered_area,
       total_area, age, publication_status)
     VALUES ($1, $2, $3, 'sale', 'apartment', 'Demo · propiedad temporal', $4,
       'Demo 123', 'USD', 1, 1, 1, 1, 1, 1, 0, 'draft')`,
    [id, `DEMO-${suffix}`, `demo-temp-${suffix}`, rows[0].id],
  );
  return true;
}

async function seed(dataSource: DataSource, file: string): Promise<void> {
  assertCanSeed(await loadManifest(file));
  const leads = dataSource.getRepository(Lead);
  const now = new Date();

  const published: Array<{ id: string; code: string }> = await dataSource.query(
    `SELECT id, code FROM properties WHERE publication_status = 'published' ORDER BY code LIMIT 1`,
  );
  const publishedProperty = published[0] ?? null;

  const manifest: DemoLeadsManifest = {
    createdAt: now.toISOString(),
    leadIds: [],
    tempPropertyId: null,
  };
  // Written before the first insert and after each one, so a crash midway can
  // still be cleaned with `remove`.
  await saveManifest(file, manifest);

  let orphanProperty: string | null = null;
  if (DEMO_LEADS.some((l) => l.link === 'orphan')) {
    const tempId = randomUUID();
    manifest.tempPropertyId = tempId;
    await saveManifest(file, manifest);
    if (await insertTempDraft(dataSource, tempId)) {
      orphanProperty = tempId;
    } else {
      manifest.tempPropertyId = null;
      await saveManifest(file, manifest);
      console.log('Orphan case skipped: no neighborhoods in the database.');
    }
  }

  const created: Array<{ id: string; label: string }> = [];
  for (const spec of DEMO_LEADS) {
    let property: Property | null = null;
    if (spec.link === 'published') {
      if (!publishedProperty) {
        console.log(`Skipped "${spec.name}": no published property exists.`);
        continue;
      }
      property = { id: publishedProperty.id } as Property;
    } else if (spec.link === 'orphan') {
      if (!orphanProperty) continue;
      property = { id: orphanProperty } as Property;
    }
    const createdAt = createdAtFor(now, spec);
    const saved = await leads.save(
      leads.create({
        type: spec.type,
        topic: spec.topic,
        status: spec.status,
        name: spec.name,
        email: spec.email,
        phone: spec.phone,
        message: spec.message,
        details: spec.details,
        property,
        createdAt,
        updatedAt: createdAt,
      }),
    );
    manifest.leadIds.push(saved.id);
    await saveManifest(file, manifest);
    const link = spec.link === 'none' ? '' : ` [${spec.link}]`;
    created.push({
      id: saved.id,
      label: `${leadCategoryOf(spec.type, spec.topic)}/${spec.status}  ${spec.name}${link}`,
    });
  }

  if (orphanProperty) {
    await dataSource.query('DELETE FROM properties WHERE id = $1', [
      orphanProperty,
    ]);
    manifest.tempPropertyId = null;
    await saveManifest(file, manifest);
    console.log(
      `Orphan case: temporary draft ${orphanProperty} created, linked to a lead and hard-deleted (the lead's property is now NULL).`,
    );
  }

  for (const { id, label } of created) console.log(`${id}  ${label}`);
  console.log(`Done: ${created.length} demo leads created.`);
}

async function remove(dataSource: DataSource, file: string): Promise<void> {
  const manifest = await loadManifest(file);
  if (!manifest) {
    console.log('No manifest: nothing to remove.');
    return;
  }
  let removed = 0;
  if (manifest.leadIds.length > 0) {
    const result = await dataSource
      .getRepository(Lead)
      .delete(manifest.leadIds);
    removed = result.affected ?? 0;
  }
  if (manifest.tempPropertyId) {
    await dataSource.query('DELETE FROM properties WHERE id = $1', [
      manifest.tempPropertyId,
    ]);
    console.log(`Removed leftover temp property ${manifest.tempPropertyId}.`);
  }
  await fs.rm(file, { force: true });
  console.log(
    `Done: ${removed} demo leads removed (${manifest.leadIds.length} in the manifest).`,
  );
}

async function main(): Promise<void> {
  assertNotProduction(process.env.NODE_ENV);
  const command = parseArgs(process.argv.slice(2));
  const file = manifestPath(process.cwd());
  const dataSource = await createDataSource();
  try {
    if (command === 'seed') await seed(dataSource, file);
    else await remove(dataSource, file);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  console.error(`Error: ${message}`);
  process.exit(1);
});
