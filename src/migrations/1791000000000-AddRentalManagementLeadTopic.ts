import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `rental_management` value to the lead topic enum (property owners
 * asking for rental administration).
 */
export class AddRentalManagementLeadTopic1791000000000 implements MigrationInterface {
  name = 'AddRentalManagementLeadTopic1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "lead_topic_enum" ADD VALUE IF NOT EXISTS 'rental_management'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres cannot drop an enum value: recreate the type without it,
    // mapping existing rows to 'other'.
    await queryRunner.query(
      `UPDATE "leads" SET "topic" = 'other' WHERE "topic" = 'rental_management'`,
    );
    await queryRunner.query(
      `ALTER TYPE "lead_topic_enum" RENAME TO "lead_topic_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "lead_topic_enum" AS ENUM ('buy', 'rent', 'sell', 'consortium', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ALTER COLUMN "topic" TYPE "lead_topic_enum" USING "topic"::text::"lead_topic_enum"`,
    );
    await queryRunner.query(`DROP TYPE "lead_topic_enum_old"`);
  }
}
