import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stored flag for "sold or rented", so public listings can put unavailable
 * properties last while keeping available and reserved ones in one group
 * (ordering by the enum itself would split reserved from available).
 */
export class AddPropertyIsUnavailable1790600000000 implements MigrationInterface {
  name = 'AddPropertyIsUnavailable1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "properties"
        ADD "is_unavailable" boolean
        GENERATED ALWAYS AS ("deal_status" IN ('sold', 'rented')) STORED NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" DROP COLUMN "is_unavailable"`,
    );
  }
}
