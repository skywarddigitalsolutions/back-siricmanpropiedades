import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProperties1790500000001 implements MigrationInterface {
  name = 'CreateProperties1790500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "property_operation_enum" AS ENUM ('sale', 'rent')`,
    );
    await queryRunner.query(
      `CREATE TYPE "property_type_enum" AS ENUM ('apartment', 'house', 'ph', 'land', 'commercial', 'office', 'garage')`,
    );
    await queryRunner.query(
      `CREATE TYPE "property_currency_enum" AS ENUM ('USD', 'ARS')`,
    );
    await queryRunner.query(
      `CREATE TYPE "property_publication_status_enum" AS ENUM ('draft', 'published', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "property_deal_status_enum" AS ENUM ('available', 'reserved', 'sold', 'rented')`,
    );
    await queryRunner.query(
      `CREATE TYPE "property_marketing_tag_enum" AS ENUM ('new', 'opportunity', 'none')`,
    );

    await queryRunner.query(
      `CREATE SEQUENCE "property_code_seq" START WITH 101`,
    );

    await queryRunner.query(`
      CREATE TABLE "properties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(20) NOT NULL DEFAULT ('SP-' || nextval('property_code_seq')),
        "slug" varchar(120) NOT NULL,
        "operation" "property_operation_enum" NOT NULL,
        "type" "property_type_enum" NOT NULL,
        "title" varchar(150) NOT NULL,
        "description" text,
        "neighborhood_id" uuid NOT NULL,
        "address" varchar(200) NOT NULL,
        "show_exact_address" boolean NOT NULL DEFAULT false,
        "currency" "property_currency_enum" NOT NULL,
        "price" numeric(14,2) NOT NULL,
        "expenses" numeric(12,2),
        "rooms" smallint NOT NULL,
        "bedrooms" smallint NOT NULL,
        "bathrooms" smallint NOT NULL,
        "has_garage" boolean NOT NULL DEFAULT false,
        "covered_area" numeric(10,2) NOT NULL,
        "total_area" numeric(10,2) NOT NULL,
        "age" smallint NOT NULL,
        "credit_eligible" boolean NOT NULL DEFAULT false,
        "pets_allowed" boolean NOT NULL DEFAULT false,
        "immediate_availability" boolean NOT NULL DEFAULT false,
        "marketing_tag" "property_marketing_tag_enum" NOT NULL DEFAULT 'none',
        "featured" boolean NOT NULL DEFAULT false,
        "has_water" boolean NOT NULL DEFAULT false,
        "has_natural_gas" boolean NOT NULL DEFAULT false,
        "has_sewer" boolean NOT NULL DEFAULT false,
        "has_electricity" boolean NOT NULL DEFAULT false,
        "has_internet" boolean NOT NULL DEFAULT false,
        "publication_status" "property_publication_status_enum" NOT NULL DEFAULT 'draft',
        "deal_status" "property_deal_status_enum" NOT NULL DEFAULT 'available',
        "first_published_at" timestamp without time zone,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_properties" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_properties_code" UNIQUE ("code"),
        CONSTRAINT "UQ_properties_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_properties_neighborhood" FOREIGN KEY ("neighborhood_id")
          REFERENCES "neighborhoods"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `ALTER SEQUENCE "property_code_seq" OWNED BY "properties"."code"`,
    );

    await queryRunner.query(`
      CREATE INDEX "IDX_properties_pub_status_first_published_at"
        ON "properties" ("publication_status", "first_published_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_properties_currency_price"
        ON "properties" ("currency", "price")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_properties_pub_status_operation_type"
        ON "properties" ("publication_status", "operation", "type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_properties_neighborhood_id"
        ON "properties" ("neighborhood_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_properties_created_at"
        ON "properties" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropping the table also drops the sequence it OWNS. The explicit
    // DROP SEQUENCE IF EXISTS below is a safety net in case ownership was
    // ever detached (it is a no-op on the normal path).
    await queryRunner.query(`DROP TABLE "properties"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "property_code_seq"`);

    await queryRunner.query(`DROP TYPE "property_marketing_tag_enum"`);
    await queryRunner.query(`DROP TYPE "property_deal_status_enum"`);
    await queryRunner.query(`DROP TYPE "property_publication_status_enum"`);
    await queryRunner.query(`DROP TYPE "property_currency_enum"`);
    await queryRunner.query(`DROP TYPE "property_type_enum"`);
    await queryRunner.query(`DROP TYPE "property_operation_enum"`);
  }
}
