import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationTable1790680000000 implements MigrationInterface {
    name = 'AddNotificationTable1790680000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('TICKET_ASSIGNED', 'TICKET_STATUS_CHANGED', 'TICKET_COMMENTED', 'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED', 'PROJECT_ROLE_CHANGED', 'ORGANIZATION_MEMBER_ADDED')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipient_id" uuid NOT NULL, "actor_id" uuid, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying(255) NOT NULL, "message" text NOT NULL, "entity_type" character varying(50) NOT NULL, "entity_id" uuid NOT NULL, "organization_id" uuid, "project_id" uuid, "data" jsonb, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient" ON "notifications" ("recipient_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_unread" ON "notifications" ("recipient_id") WHERE "read_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_recipient"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_recipient_unread"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_recipient"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
