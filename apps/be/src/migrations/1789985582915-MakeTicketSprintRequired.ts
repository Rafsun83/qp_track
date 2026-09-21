import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeTicketSprintRequired1789985582915 implements MigrationInterface {
    name = 'MakeTicketSprintRequired1789985582915'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_sprint_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "sprint_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_sprint_id" FOREIGN KEY ("sprint_id") REFERENCES "sprint"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_sprint_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "sprint_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_sprint_id" FOREIGN KEY ("sprint_id") REFERENCES "sprint"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
