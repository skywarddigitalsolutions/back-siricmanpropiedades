import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The 48 official CABA barrios (Ley 1777, Comunas, GCBA "Barrios" dataset).
 * Exported so both this migration and `caba-neighborhoods.spec.ts` share a
 * single source of truth for the seeded catalog.
 */
export const CABA_NEIGHBORHOODS: ReadonlyArray<{
  name: string;
  slug: string;
}> = [
  { name: 'Agronomía', slug: 'agronomia' },
  { name: 'Almagro', slug: 'almagro' },
  { name: 'Balvanera', slug: 'balvanera' },
  { name: 'Barracas', slug: 'barracas' },
  { name: 'Belgrano', slug: 'belgrano' },
  { name: 'Boedo', slug: 'boedo' },
  { name: 'Caballito', slug: 'caballito' },
  { name: 'Chacarita', slug: 'chacarita' },
  { name: 'Coghlan', slug: 'coghlan' },
  { name: 'Colegiales', slug: 'colegiales' },
  { name: 'Constitución', slug: 'constitucion' },
  { name: 'Flores', slug: 'flores' },
  { name: 'Floresta', slug: 'floresta' },
  { name: 'La Boca', slug: 'la-boca' },
  { name: 'La Paternal', slug: 'la-paternal' },
  { name: 'Liniers', slug: 'liniers' },
  { name: 'Mataderos', slug: 'mataderos' },
  { name: 'Monte Castro', slug: 'monte-castro' },
  { name: 'Monserrat', slug: 'monserrat' },
  { name: 'Nueva Pompeya', slug: 'nueva-pompeya' },
  { name: 'Núñez', slug: 'nunez' },
  { name: 'Palermo', slug: 'palermo' },
  { name: 'Parque Avellaneda', slug: 'parque-avellaneda' },
  { name: 'Parque Chacabuco', slug: 'parque-chacabuco' },
  { name: 'Parque Chas', slug: 'parque-chas' },
  { name: 'Parque Patricios', slug: 'parque-patricios' },
  { name: 'Puerto Madero', slug: 'puerto-madero' },
  { name: 'Recoleta', slug: 'recoleta' },
  { name: 'Retiro', slug: 'retiro' },
  { name: 'Saavedra', slug: 'saavedra' },
  { name: 'San Cristóbal', slug: 'san-cristobal' },
  { name: 'San Nicolás', slug: 'san-nicolas' },
  { name: 'San Telmo', slug: 'san-telmo' },
  { name: 'Vélez Sarsfield', slug: 'velez-sarsfield' },
  { name: 'Versalles', slug: 'versalles' },
  { name: 'Villa Crespo', slug: 'villa-crespo' },
  { name: 'Villa del Parque', slug: 'villa-del-parque' },
  { name: 'Villa Devoto', slug: 'villa-devoto' },
  { name: 'Villa General Mitre', slug: 'villa-general-mitre' },
  { name: 'Villa Lugano', slug: 'villa-lugano' },
  { name: 'Villa Luro', slug: 'villa-luro' },
  { name: 'Villa Ortúzar', slug: 'villa-ortuzar' },
  { name: 'Villa Pueyrredón', slug: 'villa-pueyrredon' },
  { name: 'Villa Real', slug: 'villa-real' },
  { name: 'Villa Riachuelo', slug: 'villa-riachuelo' },
  { name: 'Villa Santa Rita', slug: 'villa-santa-rita' },
  { name: 'Villa Soldati', slug: 'villa-soldati' },
  { name: 'Villa Urquiza', slug: 'villa-urquiza' },
];

export class CreateNeighborhoods1790500000000 implements MigrationInterface {
  name = 'CreateNeighborhoods1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "neighborhoods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(120) NOT NULL,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_neighborhoods_name" UNIQUE ("name"),
        CONSTRAINT "UQ_neighborhoods_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_neighborhoods" PRIMARY KEY ("id")
      )
    `);

    // Seed the 48 barrios unconditionally: independent of RUN_SEED and of
    // the SeedService/seed_history idempotency mechanism, per
    // specs/neighborhoods/spec.md -> Neighborhood Catalog Seeding.
    const valuePlaceholders: string[] = [];
    const params: string[] = [];
    CABA_NEIGHBORHOODS.forEach((neighborhood, index) => {
      const nameParamIndex = index * 2 + 1;
      const slugParamIndex = index * 2 + 2;
      valuePlaceholders.push(`($${nameParamIndex}, $${slugParamIndex})`);
      params.push(neighborhood.name, neighborhood.slug);
    });

    await queryRunner.query(
      `INSERT INTO "neighborhoods" ("name", "slug") VALUES ${valuePlaceholders.join(', ')}`,
      params,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "neighborhoods"`);
  }
}
