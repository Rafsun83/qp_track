import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizations1789406795800 implements MigrationInterface {
    name = 'AddOrganizations1789406795800'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "owner_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "organization_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "user_id" uuid NOT NULL, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c2b39d5d072886a4d9c8105eb9a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7062a4fbd9bab22ffd918e5d3d" ON "organization_members"  ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_89bde91f78d36ca41e9515d91c" ON "organization_members"  ("user_id") `);
        await queryRunner.query(`ALTER TABLE "organizations" ADD CONSTRAINT "FK_e08c0b40ce104f44edf060126fe" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_members" ADD CONSTRAINT "FK_7062a4fbd9bab22ffd918e5d3d9" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_members" ADD CONSTRAINT "FK_89bde91f78d36ca41e9515d91c6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_members" DROP CONSTRAINT "FK_89bde91f78d36ca41e9515d91c6"`);
        await queryRunner.query(`ALTER TABLE "organization_members" DROP CONSTRAINT "FK_7062a4fbd9bab22ffd918e5d3d9"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP CONSTRAINT "FK_e08c0b40ce104f44edf060126fe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_89bde91f78d36ca41e9515d91c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7062a4fbd9bab22ffd918e5d3d"`);
        await queryRunner.query(`DROP TABLE "organization_members"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
    }

}
