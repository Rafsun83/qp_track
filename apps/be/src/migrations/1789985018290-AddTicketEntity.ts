import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketEntity1789985018290 implements MigrationInterface {
    name = 'AddTicketEntity1789985018290'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'HOLD')`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "sprint_id" uuid, "title" character varying(255) NOT NULL, "description" text NOT NULL, "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'TODO', "priority" "public"."tickets_priority_enum" NOT NULL DEFAULT 'LOW', "metaData" jsonb, "created_by" uuid NOT NULL, "assignee_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_343bc942ae261bf7d4b3c3e6a51" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_project_id" ON "tickets" ("project_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_sprint_id" ON "tickets" ("sprint_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_assignee_id" ON "tickets" ("assignee_id")`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_sprint_id" FOREIGN KEY ("sprint_id") REFERENCES "sprint"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_sprint_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_assignee_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_sprint_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_project_id"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
    }

}
