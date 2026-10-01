import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeads1790700000000 implements MigrationInterface {
  name = 'CreateLeads1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "lead_type_enum" AS ENUM ('property_inquiry', 'appraisal', 'contact')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lead_status_enum" AS ENUM ('new', 'contacted', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lead_topic_enum" AS ENUM ('buy', 'rent', 'sell', 'consortium', 'other')`,
    );
    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "lead_type_enum" NOT NULL,
        "status" "lead_status_enum" NOT NULL DEFAULT 'new',
        "name" varchar(100) NOT NULL,
        "phone" varchar(30),
        "email" varchar(254),
        "message" text,
        "topic" "lead_topic_enum",
        "details" jsonb,
        "notes" text,
        "property_id" uuid,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leads" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_leads_contact" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL),
        CONSTRAINT "FK_leads_property" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_leads_status_created_at" ON "leads" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "leads"`);
    await queryRunner.query(`DROP TYPE "lead_topic_enum"`);
    await queryRunner.query(`DROP TYPE "lead_status_enum"`);
    await queryRunner.query(`DROP TYPE "lead_type_enum"`);
  }
}
