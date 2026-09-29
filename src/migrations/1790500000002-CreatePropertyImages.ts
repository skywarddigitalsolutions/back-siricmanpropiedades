import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePropertyImages1790500000002 implements MigrationInterface {
  name = 'CreatePropertyImages1790500000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "property_images" (
        "id" uuid NOT NULL,
        "property_id" uuid NOT NULL,
        "position" smallint NOT NULL,
        "large_key" varchar(255) NOT NULL,
        "thumb_key" varchar(255) NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "thumb_width" integer NOT NULL,
        "thumb_height" integer NOT NULL,
        "large_bytes" integer NOT NULL,
        "thumb_bytes" integer NOT NULL,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_property_images" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_property_images_position" CHECK ("position" >= 0),
        CONSTRAINT "UQ_property_images_property_position" UNIQUE ("property_id", "position")
          DEFERRABLE INITIALLY IMMEDIATE,
        CONSTRAINT "FK_property_images_property" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "property_images"`);
  }
}
