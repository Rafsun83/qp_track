import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogTable1790596375714 implements MigrationInterface {
    name = 'AddAuditLogTable1790596375714'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('TICKET_CREATED', 'TICKET_UPDATED', 'TICKET_DELETED', 'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED', 'PROJECT_MEMBER_ROLE_UPDATED')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actor_id" uuid, "action" "public"."audit_logs_action_enum" NOT NULL, "entity_type" character varying(50) NOT NULL, "entity_id" uuid NOT NULL, "organization_id" uuid, "project_id" uuid, "before" jsonb, "after" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actor" ON "audit_logs"  ("actor_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_organization" ON "audit_logs"  ("organization_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs"  ("entity_type", "entity_id", "created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_entity"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_organization"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_actor"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
    }

}
