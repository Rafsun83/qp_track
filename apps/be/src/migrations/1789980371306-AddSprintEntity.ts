import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSprintEntity1789980371306 implements MigrationInterface {
    name = 'AddSprintEntity1789980371306'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."sprint_status_enum" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "sprint" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "name" character varying NOT NULL, "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."sprint_status_enum" NOT NULL DEFAULT 'PLANNED', CONSTRAINT "PK_f371c7b5c4bc62fb2ba2bdb9f61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_sprint_project_id" ON "sprint" ("project_id")`);
        await queryRunner.query(`ALTER TABLE "sprint" ADD CONSTRAINT "FK_sprint_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sprint" DROP CONSTRAINT "FK_sprint_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_sprint_project_id"`);
        await queryRunner.query(`DROP TABLE "sprint"`);
        await queryRunner.query(`DROP TYPE "public"."sprint_status_enum"`);
    }

}
