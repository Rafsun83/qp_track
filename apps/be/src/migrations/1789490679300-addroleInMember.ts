import { MigrationInterface, QueryRunner } from "typeorm";

export class AddroleInMember1789490679300 implements MigrationInterface {
    name = 'AddroleInMember1789490679300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."organization_members_role_enum" AS ENUM('OWNER', 'ADMIN', 'MEMBER')`);
        await queryRunner.query(`ALTER TABLE "organization_members" ADD "role" "public"."organization_members_role_enum" NOT NULL DEFAULT 'MEMBER'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_members" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."organization_members_role_enum"`);
    }

}
