/**
 * Comando del operador: carga o borra propiedades de demostración para una
 * presentación.
 *
 *   producción: docker compose exec api node dist/cli/demo-properties.js seed /tmp/demo-photos
 *               docker compose exec api node dist/cli/demo-properties.js remove
 *   desarrollo: npm run demo:seed -- <carpetaDeFotos>   |   npm run demo:remove
 *
 * `seed` crea las propiedades del fixture (publicadas) con el mismo circuito
 * que el panel (PropertiesService + PropertyImagesService: WebP + miniatura,
 * mismas rutas y filas) y guarda un manifiesto en `<MEDIA_ROOT>`. `remove`
 * borra exactamente lo que figura en el manifiesto y deja la secuencia de
 * códigos sin huecos.
 */
import 'reflect-metadata';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Inject, Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { MediaModule } from '../media/media.module';
import { MEDIA_CONFIG } from '../media/media.config';
import type { MediaConfig } from '../media/media.config';
import { STORAGE_PORT } from '../media/storage/storage.port';
import type { StoragePort } from '../media/storage/storage.port';
import { Neighborhood } from '../neighborhoods/entities/neighborhood.entity';
import { PropertyImage } from '../properties/entities/property-image.entity';
import { Property } from '../properties/entities/property.entity';
import { PropertyImagesRepository } from '../properties/images/property-images.repository';
import { PropertyImagesService } from '../properties/images/property-images.service';
import { propertyMediaPrefix } from '../properties/images/property-image-keys';
import { PropertiesService } from '../properties/services/properties.service';
import {
  DEMO_PROPERTIES,
  DemoPropertyFixture,
  toCreatePropertyDto,
} from './demo-properties.fixture';
import {
  assertCanRemove,
  assertCanSeed,
  computeSequenceReset,
  DemoManifest,
  loadManifest,
  manifestPath,
  parseArgs,
  saveManifest,
  selectImageFiles,
  SequenceState,
} from './demo-properties.helpers';

const SEQUENCE = 'property_code_seq';
const VIA = { via: 'demo-cli' };

@Injectable()
class DemoPropertiesRunner {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(MEDIA_CONFIG) private readonly media: MediaConfig,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly properties: PropertiesService,
    private readonly images: PropertyImagesService,
    private readonly audit: AuditLogService,
  ) {}

  async seed(photosDir: string): Promise<void> {
    const file = manifestPath(this.media.root);
    assertCanSeed(await loadManifest(file));

    // Validate everything before touching the database.
    const plans: Array<{
      fixture: DemoPropertyFixture;
      neighborhood: Neighborhood;
      folder: string;
      names: string[];
    }> = [];
    for (const fixture of DEMO_PROPERTIES) {
      const neighborhood = await this.dataSource
        .getRepository(Neighborhood)
        .findOne({ where: { slug: fixture.neighborhood } });
      if (!neighborhood)
        throw new Error(`No existe el barrio "${fixture.neighborhood}"`);
      const folder = path.join(photosDir, fixture.photos);
      let names: string[];
      try {
        names = selectImageFiles(await fs.readdir(folder));
      } catch {
        throw new Error(`No se pudo leer la carpeta de fotos ${folder}`);
      }
      if (names.length === 0)
        throw new Error(`La carpeta ${folder} no tiene fotos (jpg/png/webp)`);
      plans.push({ fixture, neighborhood, folder, names });
    }

    const manifest: DemoManifest = {
      createdAt: new Date().toISOString(),
      sequenceBefore: await this.readSequence(),
      properties: [],
    };
    // Written before the first insert and after every property, so a crash
    // midway can still be cleaned with `remove`.
    await saveManifest(file, manifest);

    for (const { fixture, neighborhood, folder, names } of plans) {
      const created = await this.properties.create(
        toCreatePropertyDto(fixture, neighborhood.id),
      );
      manifest.properties.push({ id: created.id, code: created.code });
      await saveManifest(file, manifest);
      await this.properties.publish(created.id);

      for (const name of names) {
        const buffer = await fs.readFile(path.join(folder, name));
        await this.images.upload(created.id, {
          buffer,
        } as Express.Multer.File);
      }
      console.log(`${created.code}  ${fixture.title}  (${names.length} fotos)`);
    }
    console.log(
      `Listo: ${manifest.properties.length} propiedades de demostración publicadas.`,
    );
  }

  async remove(): Promise<void> {
    const file = manifestPath(this.media.root);
    const manifest = assertCanRemove(await loadManifest(file));

    for (const { id, code } of manifest.properties) {
      const deleted = await this.dataSource.transaction(async (manager) => {
        const rows: Array<{ title: string }> = await manager.query(
          'SELECT title FROM properties WHERE id = $1 FOR UPDATE',
          [id],
        );
        if (rows.length === 0) return null;
        await manager.query(
          'DELETE FROM property_images WHERE property_id = $1',
          [id],
        );
        await manager.query('DELETE FROM properties WHERE id = $1', [id]);
        return rows[0];
      });
      // Idempotent: also cleans files left by a crashed seed.
      await this.storage.deletePrefix(propertyMediaPrefix(id));

      if (deleted) {
        await this.audit.record({
          action: AuditAction.PROPERTY_DELETED,
          entityType: 'property',
          entityId: id,
          metadata: { code, title: deleted.title, ...VIA },
        });
        console.log(`Borrada ${code}  ${deleted.title}`);
      } else {
        console.log(`Omitida ${code}: ya no existe (se limpiaron sus fotos)`);
      }
    }

    const remaining: Array<{ code: string }> = await this.dataSource.query(
      'SELECT code FROM properties',
    );
    const reset = computeSequenceReset(
      remaining.map((row) => row.code),
      manifest.sequenceBefore,
    );
    await this.dataSource.query(`SELECT setval('${SEQUENCE}', $1, $2)`, [
      reset.lastValue,
      reset.isCalled,
    ]);
    await fs.rm(file, { force: true });
    console.log(
      `Listo: ${manifest.properties.length} propiedades procesadas. Secuencia de códigos en ${reset.lastValue} (is_called=${reset.isCalled}).`,
    );
  }

  private async readSequence(): Promise<SequenceState> {
    const rows: Array<{ last_value: string; is_called: boolean }> =
      await this.dataSource.query(
        `SELECT last_value, is_called FROM ${SEQUENCE}`,
      );
    return {
      lastValue: Number(rows[0].last_value),
      isCalled: rows[0].is_called,
    };
  }
}

/**
 * Minimal module: the same services the API uses for properties and images,
 * without controllers, auth, scheduler or HTTP. Schema migrations are the
 * API's job (it already ran them), so none run here.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([Property, PropertyImage, Neighborhood, AuditLog]),
    MediaModule,
  ],
  providers: [
    PropertiesService,
    PropertyImagesService,
    PropertyImagesRepository,
    AuditLogService,
    DemoPropertiesRunner,
  ],
})
class DemoPropertiesModule {}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(DemoPropertiesModule, {
    logger: ['error', 'warn'],
  });
  try {
    const runner = app.get(DemoPropertiesRunner);
    if (args.command === 'seed') await runner.seed(args.photosDir);
    else await runner.remove();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Error inesperado';
  console.error(`Error: ${message}`);
  process.exit(1);
});
