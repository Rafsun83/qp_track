import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommentEntity1789991788876 implements MigrationInterface {
    name = 'AddCommentEntity1789991788876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "ticket_id" uuid NOT NULL, "comment" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_comments_user_id" ON "comments" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_comments_ticket_id" ON "comments" ("ticket_id")`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_ticket_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_ticket_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_comments_ticket_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_comments_user_id"`);
        await queryRunner.query(`DROP TABLE "comments"`);
    }

}
