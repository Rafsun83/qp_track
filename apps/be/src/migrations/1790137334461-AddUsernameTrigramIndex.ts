import { MigrationInterface, QueryRunner } from "typeorm";

// UserService.findAll's username search does a both-sides-wildcard
// ILIKE '%text%', which a plain B-tree index (including the one already
// backing the unique constraint on this column) cannot accelerate - it can
// only help exact-match or prefix ('text%') lookups. pg_trgm's GIN index
// breaks the column into trigrams and can accelerate ILIKE/LIKE/regex
// substring matches regardless of wildcard position. Confirmed via
// EXPLAIN ANALYZE: without this index the query does a Seq Scan; with it,
// a Bitmap Index Scan on IDX_users_userName_trgm.
export class AddUsernameTrigramIndex1790137334461 implements MigrationInterface {
    name = 'AddUsernameTrigramIndex1790137334461'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
        await queryRunner.query(`CREATE INDEX "IDX_users_userName_trgm" ON "users" USING gin ("userName" gin_trgm_ops)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_users_userName_trgm"`);
        // Deliberately not dropping the pg_trgm extension itself - other
        // indexes/extensions in the database may depend on it.
    }

}
