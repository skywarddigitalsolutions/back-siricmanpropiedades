import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lead emails are case-insensitive: lowercase and trim the stored ones and
 * index `lower(email)` for the clients view (grouping and search).
 */
export class NormalizeLeadEmails1790800000000 implements MigrationInterface {
  name = 'NormalizeLeadEmails1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "leads" SET "email" = lower(btrim("email")) WHERE "email" IS NOT NULL AND "email" <> lower(btrim("email"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leads_lower_email" ON "leads" (lower("email"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The original casing is not recoverable; only the index is dropped.
    await queryRunner.query(`DROP INDEX "IDX_leads_lower_email"`);
  }
}
