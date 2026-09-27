import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1751500000000 implements MigrationInterface {
  name = 'InitSchema1751500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(50) NOT NULL,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_name" varchar(50) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "mfa_enabled" boolean NOT NULL DEFAULT false,
        "mfa_secret" varchar(255),
        "mfa_confirmed_at" timestamp without time zone,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_user_name" UNIQUE ("user_name"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "assigned_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "seed_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'success',
        "executed_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_seed_history_name" UNIQUE ("name"),
        CONSTRAINT "PK_seed_history" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "revoked_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "jti" uuid NOT NULL,
        "expires_at" timestamp without time zone NOT NULL,
        "revoked_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_revoked_tokens_jti" UNIQUE ("jti"),
        CONSTRAINT "PK_revoked_tokens" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_id" uuid,
        "actor_user_name" varchar(50),
        "action" varchar(50) NOT NULL,
        "entity_type" varchar(50) NOT NULL,
        "entity_id" uuid,
        "metadata" jsonb,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_entity_type_entity_id" ON "audit_logs" ("entity_type", "entity_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "mfa_backup_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "code_hash" varchar(255) NOT NULL,
        "used_at" timestamp without time zone,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mfa_backup_codes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mfa_backup_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_mfa_backup_codes_user_id" ON "mfa_backup_codes" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mfa_backup_codes"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "revoked_tokens"`);
    await queryRunner.query(`DROP TABLE "seed_history"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
