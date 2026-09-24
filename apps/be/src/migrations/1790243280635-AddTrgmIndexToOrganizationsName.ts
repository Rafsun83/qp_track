import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrgmIndexToOrganizationsName1790243280635 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX idx_organizations_name_trgm ON organizations USING GIN (name gin_trgm_ops)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_organizations_name_trgm`);
  }
}
