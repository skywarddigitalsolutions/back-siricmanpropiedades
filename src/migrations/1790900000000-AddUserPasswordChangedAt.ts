import { MigrationInterface, QueryRunner } from 'typeorm';

/** Tokens issued before this timestamp stop working (see JwtStrategy). */
export class AddUserPasswordChangedAt1790900000000 implements MigrationInterface {
  name = 'AddUserPasswordChangedAt1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_changed_at"`,
    );
  }
}
