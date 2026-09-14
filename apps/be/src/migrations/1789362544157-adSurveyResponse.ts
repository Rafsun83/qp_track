import { MigrationInterface, QueryRunner } from "typeorm";

export class AdSurveyResponse1789362544157 implements MigrationInterface {
    name = 'AdSurveyResponse1789362544157'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "survey_response" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "responseData" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9326eb52bf8b23d56a39ce419a" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "survey_response"`);
    }

}
