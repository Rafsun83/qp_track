import * as dotenv from 'dotenv';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';

dotenv.config({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });

// Resolve globs relative to this file so the same config works from `src/`
// (ts-node, local migration:* scripts) and compiled `dist/` (production image).
const rootDir = dirname(fileURLToPath(import.meta.url));
const ext = import.meta.url.endsWith('.ts') ? 'ts' : 'js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [`${rootDir}/**/*.entity.${ext}`],
  migrations: [`${rootDir}/migrations/*.${ext}`],
});
