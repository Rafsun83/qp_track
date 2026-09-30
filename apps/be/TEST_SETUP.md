# E2E Test Setup Guide (`apps/be`)

This guide explains the current state of end-to-end (e2e) testing in the backend, what is missing, and every step needed to set it up and write test cases.

All commands run from `apps/be`.

---

## 1. Current State

### Already in place ✅

| Item | Status |
|---|---|
| `vitest`, `supertest`, `@types/supertest`, `@nestjs/testing` | Installed |
| `vitest.config.e2e.ts` (matches `**/*.e2e-spec.ts`) | Exists |
| `npm run test:e2e` script | Exists |
| Decorator metadata / DI under Vitest | Works (Nest resolves providers by type) |
| Postgres (`qp_track_db` container, port 5435) and Redis | Running in Docker |
| `socket.io-client` | Installed (for testing the notification gateway later) |

### Missing ❌

1. **`test/app.e2e-spec.ts` is out of date.** It tests `GET /` expecting `"Hello World!"`, but that route no longer exists. The global `AuthGuard` also makes every route require a JWT, so this test fails.
2. **No test database or `.env.test`.** Vitest sets `NODE_ENV=test` automatically, so `ConfigModule` looks for `.env.test`. That file doesn't exist, so DB settings are `undefined` and the connection fails. Tests must not run against `qp_track_db`, because they wipe tables.
3. **The test database needs its schema.** `synchronize: false` is set, so migrations must be run against it.
4. **The test app doesn't get the `main.ts` setup.** `createNestApplication()` doesn't run `main.ts`, so `ValidationPipe` and `ClassSerializerInterceptor` would be missing. Invalid input wouldn't return 400, and `password` would appear in responses.
5. **No cleanup between tests.** Tests share one database, so tables must be emptied between tests and files must run one at a time.
6. **No login helper.** Almost every route needs a Bearer token.
7. **Separate issue: 5 of 19 unit tests currently fail.** `auth.controller.spec.ts` and `auth.service.spec.ts` don't provide mocks for `UserService` and `JwtService` ("Nest can't resolve dependencies…").

---

## 2. Setup, Step by Step

### Step 1: Create a test database

```bash
docker exec qp_track_db psql -U postgres -c "CREATE DATABASE qp_track_test_db;"
```

### Step 2: Create `.env.test`

Copy `.env.development` and change the DB name. `.gitignore` already ignores `.env.*`, so this file won't be committed.

```env
PORT=3002
CORS_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=5435
DB_USERNAME=postgres
DB_PASSWORD=<same as dev>
DB_NAME=qp_track_test_db
JWT_SECRET=test-secret
JWT_EXPIRES_IN=1h
```

Leave out `REDIS_URL`; plain HTTP e2e tests don't use Redis.

### Step 3: Run migrations on the test database

```bash
NODE_ENV=test npm run migration:run
```

`data-source.ts` reads `.env.${NODE_ENV}`, so this targets the test DB. Re-run it whenever a new migration is added.

### Step 4: Move the shared app setup out of `main.ts`

Create `src/app.setup.ts`:

```ts
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export function configureApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}
```

In `main.ts`, call `configureApp(app)` and remove the two `useGlobalPipes` calls and the `useGlobalInterceptors` call. `main.ts` currently registers `ValidationPipe` twice; this single merged pipe does the same job.

### Step 5: Update `vitest.config.e2e.ts`

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false, // all files share one DB, so run them one at a time
    testTimeout: 20000,
    hookTimeout: 30000, // app boot + DB connection can be slow
    env: { NODE_ENV: 'test' },
  },
});
```

### Step 6: Add test helpers in `test/utils/test-app.ts`

```ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    // .overrideProvider(SomeExternalService).useValue(mock)  // mock external calls here
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

export async function resetDatabase(app: INestApplication) {
  const ds = app.get(DataSource);
  const tables = ds.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
  await ds.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export async function registerAndLogin(
  app: INestApplication<App>,
  overrides: Partial<Record<string, string>> = {},
) {
  const user = {
    name: 'Test User',
    email: `user${Date.now()}@test.com`,
    userName: `user${Date.now()}`,
    location: 'Dhaka',
    password: 'password123',
    ...overrides,
  };
  await request(app.getHttpServer())
    .post('/auth/register')
    .send(user)
    .expect(201);
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ username: user.userName, password: user.password })
    .expect(200);
  return { user, token: res.body.data.access_token as string };
}
```

`ResponseInterceptor` wraps every response as `{ statusCode, message, data, timestamp }`, so the token is at `body.data.access_token`.

### Step 7: Replace `test/app.e2e-spec.ts` with a real test

Delete `test/app.e2e-spec.ts` and create `test/auth.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app.js';

describe('Auth & Users (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects protected routes without a token', () =>
    request(app.getHttpServer()).get('/api/users/me').expect(401));

  it('rejects invalid register payload', () =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400));

  it('registers, logs in, and fetches /api/users/me', async () => {
    const { user, token } = await registerAndLogin(app);
    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe('Current user fetched successfully');
    expect(res.body.data.userName).toBe(user.userName);
    expect(res.body.data.password).toBeUndefined(); // @Exclude() + ClassSerializerInterceptor
  });

  it('returns 409 on duplicate userName', async () => {
    const { user } = await registerAndLogin(app);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...user, email: 'other@test.com' })
      .expect(409);
  });

  it('wrong password → 401', async () => {
    const { user } = await registerAndLogin(app);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.userName, password: 'wrongpass1' })
      .expect(401);
  });
});
```

### Step 8: Run the tests

```bash
npm run test:e2e
# single file
npx vitest run test/auth.e2e-spec.ts --config ./vitest.config.e2e.ts
```

---

## 3. Guidelines for Writing More E2E Tests

- **One file per feature:** `organizations.e2e-spec.ts`, `projects.e2e-spec.ts`, `tickets.e2e-spec.ts`, and so on.
- **Create the app once per file** (`beforeAll`) and **reset the DB for each test** (`beforeEach`). Booting the app for every test is slow.
- **Set up data through the API** (register → create org → create project → create ticket), and put repeated chains in helpers like `createOrg(app, token)`. That way guards and `RolesGuard` checks are tested too.
- **Cover each endpoint for:**
  - success (2xx + response shape)
  - validation errors (400)
  - no token (401)
  - wrong role / not the owner (403, e.g. `PATCH /api/users/:id` for another user)
  - not found (404)
  - conflict (409)
- **Pagination:** check `body.pagination` along with `body.data.length`.
- **Mock external things** with `.overrideProvider(...)`, such as outbound webhook HTTP calls. `ObserveModule` can also be mocked if it tries to reach the network with the placeholder keys.
- **Cron jobs** (`NotificationCleanupService`) aren't triggered in tests. Test their logic by getting the service with `app.get(NotificationCleanupService)` and calling the method directly.
- **WebSocket notifications:** call `app.listen(0)`, connect with `socket.io-client` to the chosen port, trigger the action over HTTP, then assert on the received event.

---

## 4. Fixing the Failing Unit Specs

`auth.controller.spec.ts` and `auth.service.spec.ts` fail because their testing modules don't provide every constructor dependency. Add mocks to the `providers` array:

```ts
providers: [
  AuthService,
  { provide: UserService, useValue: { findOneByUserName: vi.fn(), incrementLoginCount: vi.fn(), create: vi.fn() } },
  { provide: JwtService, useValue: { signAsync: vi.fn().mockResolvedValue('token') } },
],
```

(In `auth.controller.spec.ts`, also mock `AuthService` instead of using the real one.)

Run unit tests with:

```bash
npm run test
```

---

## 5. Checklist

- [ ] Create `qp_track_test_db` database
- [ ] Create `.env.test`
- [ ] Run `NODE_ENV=test npm run migration:run`
- [ ] Add `src/app.setup.ts` and use `configureApp(app)` in `main.ts`
- [ ] Update `vitest.config.e2e.ts`
- [ ] Add `test/utils/test-app.ts`
- [ ] Replace `test/app.e2e-spec.ts` with `test/auth.e2e-spec.ts`
- [ ] Run `npm run test:e2e` and confirm it passes
- [ ] Fix the 5 failing unit specs
