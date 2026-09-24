import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceLogTable1790250131485 implements MigrationInterface {
    name = 'AddPerformanceLogTable1790250131485'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_ticket_id"`);
        await queryRunner.query(`ALTER TABLE "sprint" DROP CONSTRAINT "FK_sprint_project_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_sprint_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_comments_ticket_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_comments_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_sprint_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_assignee_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_sprint_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_project_id"`);
        await queryRunner.query(`CREATE TABLE "api_performance_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "method" character varying NOT NULL, "endpoint" character varying NOT NULL, "durationMs" integer NOT NULL, "userId" character varying, "statusCode" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_14f6850ed8842418645fb6f31d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2babaf44dc1761c990f8a1cc57" ON "api_performance_logs"  ("endpoint", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_4c675567d2a58f0b07cef09c13" ON "comments"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_be8180d9b44a05e449b85f5b77" ON "comments"  ("ticket_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ce4f0a9ae20ecf7b679990b760" ON "sprint"  ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ad2a415688c613c9897f7975ef" ON "tickets"  ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_82ea28a5e1dfc8bf74ae8c8e09" ON "tickets"  ("sprint_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_dff6e2b44c9b5e177114588772" ON "tickets"  ("assignee_id") `);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_be8180d9b44a05e449b85f5b773" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sprint" ADD CONSTRAINT "FK_ce4f0a9ae20ecf7b679990b7606" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_ad2a415688c613c9897f7975efd" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_82ea28a5e1dfc8bf74ae8c8e091" FOREIGN KEY ("sprint_id") REFERENCES "sprint"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_82ea28a5e1dfc8bf74ae8c8e091"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_ad2a415688c613c9897f7975efd"`);
        await queryRunner.query(`ALTER TABLE "sprint" DROP CONSTRAINT "FK_ce4f0a9ae20ecf7b679990b7606"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_be8180d9b44a05e449b85f5b773"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dff6e2b44c9b5e177114588772"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_82ea28a5e1dfc8bf74ae8c8e09"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad2a415688c613c9897f7975ef"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce4f0a9ae20ecf7b679990b760"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_be8180d9b44a05e449b85f5b77"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c675567d2a58f0b07cef09c13"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2babaf44dc1761c990f8a1cc57"`);
        await queryRunner.query(`DROP TABLE "api_performance_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_project_id" ON "tickets" USING btree ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_sprint_id" ON "tickets" USING btree ("sprint_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_assignee_id" ON "tickets" USING btree ("assignee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_sprint_project_id" ON "sprint" USING btree ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_comments_user_id" ON "comments" USING btree ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_comments_ticket_id" ON "comments" USING btree ("ticket_id") `);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_sprint_id" FOREIGN KEY ("sprint_id") REFERENCES "sprint"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sprint" ADD CONSTRAINT "FK_sprint_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_ticket_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
