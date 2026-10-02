# Docker Process in Prod

How the production stack runs in Docker: what each file does, how the images
are built, how a deployment starts, and the day-to-day operations.

For local development, see `DOCKER_PROCESS_IN_DEV.md`.

---

## 1. Files involved

| File | Purpose |
|---|---|
| `apps/be/Dockerfile` | Multi-stage build of the NestJS backend → image `qp_track-be:latest` (~354 MB). |
| `apps/fe/Dockerfile` | Multi-stage build of the React frontend, served by nginx → image `qp_track-fe:latest` (~49 MB). |
| `apps/fe/nginx/default.conf` | nginx config: serves the built app and proxies API / WebSocket traffic to `be`. |
| `docker-compose.prod.yml` | Defines the production services: `db`, `redis`, `migrate`, `be`, `fe`. |
| `.env.prod.example` | Template for secrets and settings. Copy to `.env.prod` (git-ignored). |
| `.dockerignore` | Keeps `node_modules`, `dist`, `.turbo`, `.git` and every `.env*` file out of the images. |

---

## 2. Dev vs prod

| | Dev (`docker-compose.yml`) | Prod (`docker-compose.prod.yml`) |
|---|---|---|
| Code | Bind-mounted from your machine | Built into the image |
| Backend | `nest start --watch` | `node dist/main.js` (compiled) |
| Frontend | Vite dev server on 5173 | Static build served by nginx on 80 |
| Dependencies | All, including dev tools | Backend: production dependencies only |
| Dockerfile | One shared `Dockerfile.dev` | One per app |
| Secrets | Dev defaults (`password`) | Required from `.env.prod` |
| Ports on host | db, redis, be, fe | Only `fe` (nginx) |
| Migrations | Run before `nest start` in `be` | Separate one-off `migrate` service |
| Data volume | Existing `postgres17_data` | Its own `pg_data` volume |
| Compose project / network | `qp_track` / `qp_track_network` | `qp_track_prod` / `qp_track_prod_network` |

Dev and prod use different project names, volumes and networks, so they can
run on the same machine without touching each other's data.

---

## 3. Why separate Dockerfiles in prod

In dev, the image only holds dependencies, so both apps share one image. In
prod, each image must contain **the built app and only what it needs to run**:

- the backend needs Node, compiled `dist/` and production `node_modules`;
- the frontend needs only static HTML/JS/CSS and a web server (nginx), with no
  Node at all.

Those are very different images, so each app has its own Dockerfile. Both are
still built **from the repo root** (`context: .`), because npm workspaces share
one root `package-lock.json` and both apps depend on `packages/shared-types`.

---

## 4. `apps/be/Dockerfile` explained

Four stages. Only the last one becomes the final image.

```
base ──► build      (npm ci + nest build → apps/be/dist)
  └────► prod-deps  (npm ci --omit=dev --workspace=be)
runtime ◄── node_modules from prod-deps + dist from build
```

| Stage | What it does | Why |
|---|---|---|
| `base` | Node 24 slim, npm 11.12.1, copies only `package.json` files + lockfile | Shared starting point; caches dependency installs |
| `build` | `npm ci` (all deps), copies `packages/` and `apps/be/`, runs `nest build` | Needs TypeScript / Nest CLI to compile |
| `prod-deps` | `npm ci --omit=dev --workspace=be` | Installs only the backend's runtime dependencies |
| `runtime` | Fresh Node 24 slim; copies prod `node_modules` + `apps/be/dist`; runs as user `node` | Small image, no compilers or dev tools, not running as root |

The final command is `node dist/main.js`, run from `/app/apps/be`.

**Notes:**

- `apps/be/src/data-source.ts` resolves its entity and migration paths
  relative to its own file, so the same file works from `src/` (local
  `migration:*` scripts) and from compiled `dist/` (the `migrate` service).
- `dotenv` is a declared dependency of `be`, because `data-source.ts` imports
  it. Without it, migrations crash in the production image.
- No `.env*` file is copied into the image. All configuration comes from
  environment variables set by `docker-compose.prod.yml`.

---

## 5. `apps/fe/Dockerfile` explained

| Stage | What it does |
|---|---|
| `build` | Node 24 slim, npm 11.12.1, `npm ci`, copies `packages/` and `apps/fe/`, runs `npm run build --workspace=fe` (`tsc -b && vite build`) → `apps/fe/dist` |
| `runtime` | `nginx:1.27-alpine`; copies `apps/fe/nginx/default.conf` and the built `dist/` into `/usr/share/nginx/html` |

The final image contains no Node, no source code and no `node_modules`, only
static files and nginx.

---

## 6. nginx (`apps/fe/nginx/default.conf`)

nginx does the job that the Vite proxy does in dev:

| Path | Handling |
|---|---|
| `/api/*`, `/auth/*`, `/webhook/*` | Proxied to `be:3001` with `Host` / `X-Forwarded-*` headers |
| `/socket.io/*` | Proxied to `be:3001` with WebSocket upgrade headers, 1 h read timeout |
| `/assets/*` | Static files with `Cache-Control: public, immutable`, 1 year (Vite hashes the filenames) |
| Everything else | `try_files $uri $uri/ /index.html`, so direct links such as `/organizations/123` load the React app |

Because the browser talks only to nginx (one origin), there are no CORS issues.

---

## 7. Architecture

```
 Internet / your machine              Docker network: qp_track_prod_network
 ───────────────────────              ─────────────────────────────────────
 browser ──► host:${APP_PORT} ──────► fe   (nginx :80)
             (default 8080)             │  /api, /auth, /webhook, /socket.io
                                        ▼
                                      be   (node dist/main.js :3001)
                                        ├──► db:5432     (Postgres 17, volume pg_data)
                                        └──► redis:6379  (Redis 7, AOF on, volume redis_data)

                                      migrate (one-off, runs before be, then exits)
```

| Service | Image | Published on host | Role |
|---|---|---|---|
| `db` | `postgres:17` | No | Database (`pg_data` volume) |
| `redis` | `redis:7-alpine` | No | Socket.IO Redis adapter (`redis_data` volume, append-only file enabled) |
| `migrate` | `qp_track-be:latest` | No | Runs pending TypeORM migrations, then exits |
| `be` | `qp_track-be:latest` | No | NestJS API |
| `fe` | `qp_track-fe:latest` | `${APP_PORT:-8080} → 80` | nginx: frontend + reverse proxy |

Only nginx is reachable from outside. Postgres, Redis and the backend can be
reached only from inside the Docker network.

---

## 8. Configuration (`.env.prod`)

```bash
cp .env.prod.example .env.prod
```

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `APP_PORT` | No | `8080` | Host port nginx is published on |
| `CORS_ORIGIN` | No | `http://localhost:8080` | Public URL of the site, e.g. `https://track.example.com` |
| `DB_USERNAME` | No | `postgres` | Postgres user |
| `DB_PASSWORD` | **Yes** | - | Postgres password |
| `DB_NAME` | No | `qp_track_db` | Database name |
| `JWT_SECRET` | **Yes** | - | JWT signing secret. Generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | No | `1h` | Token lifetime |

Compose refuses to start if `DB_PASSWORD` or `JWT_SECRET` is missing
(`${VAR:?...}` syntax).

Fixed inside the compose file: `NODE_ENV=production`, `PORT=3001`,
`DB_HOST=db`, `DB_PORT=5432`, `REDIS_URL=redis://redis:6379`.

**Important:**

- Never commit `.env.prod` (it is in `.gitignore`).
- `DB_USERNAME`, `DB_PASSWORD` and `DB_NAME` are applied to Postgres **only
  the first time** the `pg_data` volume is created. Changing them later does not
  change the existing database user's password. Change it inside Postgres
  (`ALTER USER ...`) and update `.env.prod` to match.
- Changing `JWT_SECRET` logs every user out (existing tokens become invalid).

---

## 9. What happens on `up`

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

1. **Build:** `qp_track-be:latest` (via the `migrate` service's `build`) and
   `qp_track-fe:latest` are built.
2. **`db` and `redis` start** and run their health checks.
3. **`migrate`** waits for `db` to be healthy, then runs
   `node /app/node_modules/typeorm/cli.js migration:run -d dist/data-source.js`
   and exits with code 0.
4. **`be`** waits for `migrate` to complete successfully and for `redis` to be
   healthy, then starts. Its health check calls `/health`. Because that route
   is behind the global auth guard, any non-5xx response (including 401) counts
   as "up".
5. **`fe` (nginx)** waits for `be` to be healthy, then starts serving on
   `APP_PORT`.

If migrations fail, `migrate` exits non-zero and `be` never starts, so the API
never runs against a half-migrated database.

All long-running services use `restart: unless-stopped`, so they come back
after a crash or a server reboot.

---

## 10. First deployment

```bash
# 1. Configure
cp .env.prod.example .env.prod
#    edit .env.prod: set DB_PASSWORD, JWT_SECRET, CORS_ORIGIN, APP_PORT

# 2. Build and start
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 3. Check
docker compose -f docker-compose.prod.yml --env-file .env.prod ps -a
docker compose -f docker-compose.prod.yml --env-file .env.prod logs migrate
docker compose -f docker-compose.prod.yml --env-file .env.prod logs be
```

Expected `ps -a`: `db`, `redis`, `be` **healthy**; `fe` **running**; `migrate`
**exited (0)**.

Then open `http://<server>:${APP_PORT}`.

Tip: to avoid repeating the flags, define an alias:

```bash
alias dcp='docker compose -f docker-compose.prod.yml --env-file .env.prod'
# dcp ps, dcp logs -f be, dcp up -d --build, ...
```

The commands below use `dcp` for short.

---

## 11. Deploying an update

```bash
git pull
dcp up -d --build
```

- Images are rebuilt. Only changed layers rebuild; dependency installs stay
  cached unless `package.json` / `package-lock.json` changed.
- `migrate` runs again and applies only new migrations.
- `be` and `fe` are recreated with the new images.
- Data in `pg_data` and `redis_data` is kept.

If `migrate` shows an old result, or `be` does not pick up the new image, force
fresh containers:

```bash
dcp up -d --build --force-recreate
```

---

## 12. Day-to-day commands

| Task | Command |
|---|---|
| Status | `dcp ps -a` |
| Follow logs | `dcp logs -f be fe` |
| Migration output | `dcp logs migrate` |
| Restart backend | `dcp restart be` |
| Run migrations manually | `dcp run --rm migrate` |
| Show migration status | `dcp exec be node /app/node_modules/typeorm/cli.js migration:show -d dist/data-source.js` |
| psql shell | `dcp exec db psql -U postgres -d qp_track_db` |
| Stop (keep data) | `dcp down` |
| Stop and **delete all data** | `dcp down -v` (removes `pg_data` and `redis_data`) |

---

## 13. Backups

**Back up:**

```bash
dcp exec -T db pg_dump -U postgres -Fc qp_track_db > backup_$(date +%F).dump
```

**Restore:**

```bash
dcp exec -T db pg_restore -U postgres -d qp_track_db --clean < backup_2026-10-01.dump
```

**Copy dev data into prod** (optional, e.g. to start prod with the seeded
data):

```bash
docker exec qp_track_db pg_dump -U postgres -Fc qp_track_db > dev.dump
dcp exec -T db pg_restore -U postgres -d qp_track_db --clean --if-exists < dev.dump
```

Back up before every update that includes migrations, and store copies off
the server.

---

## 14. Data safety

| Command | Effect on data |
|---|---|
| `dcp down`, `dcp restart`, `dcp up -d --build` | Safe, volumes are kept |
| `dcp down -v` | **Deletes** `pg_data` and `redis_data` |
| `docker volume rm qp_track_prod_pg_data` | **Deletes** the database |
| `docker system prune --volumes` | **Deletes** unused volumes (while the stack is down) |

The prod volumes are named `qp_track_prod_pg_data` and
`qp_track_prod_redis_data`. They are separate from the dev `postgres17_data`
volume.

---

## 15. Before going live (checklist)

- [ ] **HTTPS.** The stack serves plain HTTP. Put a TLS-terminating reverse
      proxy in front (e.g. Caddy, Traefik, or a cloud load balancer), or add
      TLS to the nginx config.
- [ ] **Strong secrets.** Use a real `DB_PASSWORD` and a long random
      `JWT_SECRET`.
- [ ] **`CORS_ORIGIN`** set to the real public URL.
- [ ] **Observe keys.** `apps/be/src/app.module.ts` has placeholder
      `@nestjs/observe` keys (`YOUR_APP_KEY` / `YOUR_APP_SECRET`) hard-coded.
      Move them to env vars with real values (or remove the module).
- [ ] **Backups scheduled** (e.g. cron running the `pg_dump` command above).
- [ ] **Firewall.** Only the HTTP/HTTPS port should be open.
- [ ] **Swagger.** `/docs` is not proxied by nginx and `be` is not published,
      so the API docs are not publicly reachable. Add a `location /docs` block
      to nginx only if you want them public.

---

## 16. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `required variable DB_PASSWORD is missing` (or `JWT_SECRET`) | `.env.prod` missing, or `--env-file .env.prod` not passed. |
| `service "migrate" didn't complete successfully` | Check `dcp logs migrate`. If it shows an old error after a fix, run `dcp up -d --build --force-recreate`. |
| `Cannot find package '...'` in `migrate` / `be` | A runtime import is not declared in `apps/be/package.json` `dependencies`. Add it (`npm install <pkg> --workspace=be` at the repo root) and rebuild. |
| `be` stays `unhealthy` | `dcp logs be`. Usually a database or Redis connection error, or a bad env var. |
| `fe` stuck in `created` | It waits for `be` to be healthy. Fix `be` first. |
| `502 Bad Gateway` from nginx | `be` is down or restarting. Check `dcp ps` and `dcp logs be`. |
| Database password rejected after editing `.env.prod` | Postgres keeps the password from first initialisation. See section 8. |
| `port is already allocated` | Another process uses `APP_PORT`. Change `APP_PORT` in `.env.prod`. |
| Realtime notifications not arriving | Check `/socket.io/` is proxied (WebSocket headers) and `be` logs `Socket.IO Redis adapter connected`. |
| `[ObserveAgentWorker] Telemetry rejected (401)` | Placeholder observe keys. See the checklist in section 15. |

---

## 17. More information

### 17.1 Why `apps/be/Dockerfile` copies `apps/fe/package.json`

The backend Dockerfile copies **only** `apps/fe/package.json`. No frontend
source code goes into the backend image.

The repo is an npm workspaces monorepo with **one shared `package-lock.json`**
that lists every workspace (`apps/be`, `apps/fe`, `packages/*`). `npm ci` is
strict: it checks that the lockfile matches the workspace `package.json` files
it can see. If `apps/fe/package.json` were missing, the lockfile would describe
a workspace npm cannot find, and `npm ci` would fail because the lockfile is out
of sync.

So the `base` stage copies all five workspace manifests, including ones the
backend never uses (`fe`, `eslint-config`), to keep npm's view of the workspace
tree identical to the lockfile.

Copying only the `package.json` files before the source also helps Docker
caching: the `npm ci` layer is reused until a dependency changes, and editing
source code does not trigger a reinstall.

### 17.2 Is this needed for every application?

No. It is needed only because this is a **monorepo with a shared lockfile**.
A standalone single-app project has one `package.json` and one lockfile, and
its Dockerfile is simpler:

```dockerfile
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/main.js"]
```

| Practice | Every app | Monorepo only |
|---|---|---|
| Copy `package.json` + lockfile before source (layer caching) | ✓ | |
| Multi-stage build, ship only `dist` + production deps | ✓ | |
| `npm ci --omit=dev` for a smaller image | ✓ | |
| Non-root user (`USER node`) | ✓ | |
| Copy **every** workspace's `package.json` (including `apps/fe`) | | ✓ |
| Build context is the **repo root** (root lockfile, `packages/shared-types`) | | ✓ |
| `--workspace=be` to build or install only the backend | | ✓ |

**Cleaner option for monorepos:** Turborepo's `turbo prune be --docker` writes a
trimmed copy of the repo with only the backend, the packages it depends on, and
a lockfile cut down to match. The Dockerfile then does not need to list
`apps/fe` at all. The current approach also works; `turbo prune` scales better
as more apps and packages are added.

### 17.3 How the app gets its env values (secrets) in Docker

Secrets such as `DB_PASSWORD` and `JWT_SECRET` are **never inside the image**.
Compose reads them from a file on the host when you run `up`, and passes them
to the container as environment variables. The app reads them from
`process.env`.

```
.env.prod (on the server, not in git or the image)
        │   docker compose --env-file .env.prod up
        ▼
docker-compose.prod.yml   fills in ${JWT_SECRET}, ${DB_PASSWORD}, ...
        │   environment: block
        ▼
Container's environment variables (set when the container starts)
        │
        ▼
process.env.JWT_SECRET  →  apps/be/src/config/app.config.ts
```

**Step by step:**

1. **Create `.env.prod` on the server** (`cp .env.prod.example .env.prod`, then
   edit it). It exists only on the server: `.gitignore` keeps it out of git and
   `.dockerignore` keeps it out of the image.
2. **`--env-file .env.prod`** makes Compose read the file on the host. The file
   is not copied anywhere.
3. **Compose fills in the `${...}` placeholders** in `docker-compose.prod.yml`:

   ```yaml
   environment: &be-env
     DB_HOST: db                                                # fixed value
     DB_USERNAME: ${DB_USERNAME:-postgres}                      # default "postgres"
     DB_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD in .env.prod}  # required
     JWT_SECRET: ${JWT_SECRET:?set JWT_SECRET in .env.prod}     # required
   ```

4. **Docker starts the container with those variables**, as if
   `export JWT_SECRET=...` ran before `node dist/main.js`. They exist only in the
   running container's environment, not in any image layer.
5. **NestJS reads them.** `ConfigModule` also tries to load `.env.production`,
   but that file is not in the image (`.dockerignore` excludes `**/.env*`), so it
   finds nothing and carries on. The config files read `process.env.*`, which
   Docker has already filled. If both exist, real environment variables win over
   `.env` file values.

**Compose variable syntax:**

| Syntax | Meaning |
|---|---|
| `${VAR}` | Value from `.env.prod` or the shell |
| `${VAR:-default}` | Use `default` if `VAR` is unset |
| `${VAR:?message}` | **Stop with an error** if `VAR` is unset, so you can't deploy with no JWT secret |
| `$${VAR}` | Escaped: Compose leaves it alone, and the container's shell expands it later (used in the `db` health check) |
| `&be-env` / `*be-env` | YAML anchor and alias: `migrate` and `be` share the same `environment` block |

**Check what a container actually received:**

```bash
dcp exec be printenv | grep DB_
```

**Dev is different (`docker-compose.yml`):**

- Values are **hardcoded in the yml** (`DB_PASSWORD: password`). That's fine
  for a local throwaway database, but never do it in prod.
- `volumes: - .:/app` mounts the whole project into the container.
  `.dockerignore` applies only when an **image is built**, not to mounted
  folders, so `apps/be/.env.development` is visible inside the dev container and
  `ConfigModule` loads it. Values set in the yml still win.

**Why both `.gitignore` and `.dockerignore` exclude `.env`:**

| File | Protects against |
|---|---|
| `.gitignore` | Secrets being pushed to GitHub |
| `.dockerignore` | Secrets being baked into an image layer, where anyone who pulls the image could read them |

The idea is the same in both: **an image is a build artifact you can share, and
config is added when the container runs.** The same image can run in staging and
prod with different `.env` files.

**Later, on a cloud platform** (AWS ECS, Kubernetes, Docker Swarm), replace
`.env.prod` with the platform's secret store (AWS Secrets Manager, Kubernetes
Secrets, Docker secrets). These still inject values as environment variables or
files when the container starts, so the app code does not change.
