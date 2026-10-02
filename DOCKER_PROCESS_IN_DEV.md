# Docker Process in Dev

How the local development stack runs in Docker: what each file does, why it is
set up this way, and the day-to-day commands.

For production, see `docker-compose.prod.yml` (not covered here).

---

## 1. Files involved

Dockerfile.dev builds one image, qp_track-dev, that holds Node.js plus every npm package your monorepo needs. Both the be and fe containers run from that same image. It holds no app code; your code comes from your machine at runtime.

| File                       | Purpose                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile.dev`           | Builds one dev image (`qp_track-dev`) with Node + all npm dependencies. Used by both `be` and `fe`.                             |
| `docker-compose.yml`       | Defines the 4 dev services (`db`, `redis`, `be`, `fe`), their network, ports, volumes and env vars.                             |
| `.dockerignore`            | Keeps `node_modules`, `dist`, `.turbo`, `.git` and `.env*` files out of the image build.                                        |
| `apps/fe/vite.config.ts`   | Vite proxy target reads `VITE_PROXY_TARGET` (`http://be:3001` in Docker, falls back to `http://localhost:3001` outside Docker). |
| `apps/be/.env.development` | Still read by the backend (e.g. `JWT_SECRET`). Values set in `docker-compose.yml` take priority.                                |

---

## 2. `Dockerfile.dev` explained

```dockerfile
FROM node:24-bookworm-slim
RUN npm install -g npm@11.12.1
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY apps/be/package.json apps/be/
COPY apps/fe/package.json apps/fe/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/

RUN npm ci
```

| Step                         | What it does                                                      | Why                                                                         |
| ---------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `FROM node:24-bookworm-slim` | Node 24 on slim Debian                                            | Root `package.json` requires Node >= 24                                     |
| `npm install -g npm@11.12.1` | Installs that exact npm version                                   | Matches the npm version pinned in `devEngines`                              |
| `WORKDIR /app`               | Working directory                                                 | The repo is mounted here at runtime                                         |
| `COPY ... package.json`      | Copies only the manifests and lockfile, **not the source**        | Docker layer caching: the slow `npm ci` is reused until dependencies change |
| `npm ci`                     | Installs all workspaces exactly as `package-lock.json` lists them | Installed once at the root, as the monorepo requires                        |

The image contains **no application code**. The code comes from your machine
through a bind mount (see section 5).

---

## 3. Why one shared Dockerfile instead of one per app

1. **One lockfile, one install.** npm workspaces use a single root
   `package-lock.json` and hoist most packages to the root `node_modules`.
   `apps/be` cannot be installed on its own, and `npm install` must never be run
   inside `apps/*`.
2. **Shared local package.** Both `be` and `fe` depend on
   `packages/shared-types`, so the build context must be the repo root anyway.
3. **In dev, both images would be identical.** The image only holds
   dependencies. The only difference between `be` and `fe` is the start
   command, which `docker-compose.yml` sets with `command:`. Two Dockerfiles
   would mean two identical installs and twice the build time and disk space.

**Production is different.** There each image must contain the compiled app
and only its own runtime dependencies, so production uses separate
`apps/be/Dockerfile` and `apps/fe/Dockerfile` (both still built from the repo
root).

---

## 4. Architecture

```
 Your machine                         Docker network: qp_track_network
 ────────────                         ────────────────────────────────
 browser ──► localhost:5173 ────────► fe     (Vite dev server)
                                        │  /api, /auth, /webhook, /socket.io
                                        ▼  proxied to http://be:3001
 browser ──► localhost:3001/docs ───► be     (NestJS, watch mode)
                                        ├──► db:5432     (Postgres 17)
 DB tool ──► localhost:5435 ─────────►  │
                                        └──► redis:6379  (Socket.IO Redis adapter)
```

| Service | Container        | Image            | Host port → container port |
| ------- | ---------------- | ---------------- | -------------------------- |
| `db`    | `qp_track_db`    | `postgres:17`    | `5435 → 5432`              |
| `redis` | `qp_track_redis` | `redis:7-alpine` | `6379 → 6379`              |
| `be`    | `qp_track_be`    | `qp_track-dev`   | `3001 → 3001`              |
| `fe`    | `qp_track_fe`    | `qp_track-dev`   | `5173 → 5173`              |

All four services join the `qp_track_network` bridge network. Inside it,
containers reach each other by **service name** (`db`, `redis`, `be`), not by
`localhost`.

---

## 5. Volumes

### Code (bind mount)

```yaml
- .:/app
```

The whole repo is mounted into `/app`. Saving a file on your machine is seen
immediately inside the container:

- **be**: `nest start --watch` recompiles and restarts.
- **fe**: Vite hot-reloads the browser.

### `node_modules` (anonymous volumes)

```yaml
- /app/node_modules
- /app/apps/be/node_modules
- /app/apps/fe/node_modules
- /app/packages/shared-types/node_modules
```

These cover the `node_modules` folders so the bind mount does not replace the
container's Linux-built dependencies with your machine's. This matters for
native modules such as `bcrypt`.

### Database data (named, external volume)

```yaml
volumes:
  postgres17_data:
    external: true
```

Postgres data lives in the existing `postgres17_data` volume, not in the
container. Because it is `external`, Compose never creates or deletes it, not
even with `docker compose down -v`.

---

## 6. Environment variables (backend)

The backend reads `apps/be/.env.development`. The values in
`docker-compose.yml` take priority (neither dotenv nor `@nestjs/config`
overrides an already-set env var), so they point at the containers instead
of `localhost`:

| Variable                                  | Docker value                            | Why                                                      |
| ----------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| `NODE_ENV`                                | `development`                           | Loads `.env.development`                                 |
| `PORT`                                    | `3001`                                  | Port Nest listens on inside the container                |
| `CORS_ORIGIN`                             | `http://localhost:5173`                 | Frontend origin                                          |
| `DB_HOST` / `DB_PORT`                     | `db` / `5432`                           | Postgres service name and its internal port (not `5435`) |
| `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | `postgres` / `password` / `qp_track_db` | Dev credentials                                          |
| `REDIS_URL`                               | `redis://redis:6379`                    | Redis service name                                       |
| `JWT_SECRET`, `JWT_EXPIRES_IN`            | from `.env.development`                 | Not overridden                                           |

Frontend: `VITE_PROXY_TARGET=http://be:3001`.

---

## 7. What happens on `docker compose up`

1. **Build:** `qp_track-dev` is built from `Dockerfile.dev` (cached after the
   first time).
2. **`db` and `redis` start** and run their health checks (`pg_isready`,
   `redis-cli ping`).
3. **`be` waits** until both are healthy (`depends_on: condition: service_healthy`),
   then runs:
   ```
   npm run migration:run --workspace=be   # applies only pending migrations
   npm run dev --workspace=be             # nest start --watch
   ```
4. **`fe` starts** Vite with `--host 0.0.0.0 --port 5173` so the browser on
   your machine can reach it.

The browser only talks to `localhost:5173`. Vite forwards API and WebSocket
traffic to `be:3001`, so there are no CORS issues in dev.

---

## 8. First-time setup

Only needed once if the old standalone `qp_track_db` / `qp_track_redis`
containers still exist (same names and ports):

```bash
# Optional backup first
docker exec qp_track_db pg_dump -U postgres -Fc qp_track_db > qp_track_backup.dump

# Remove the old containers - data stays in the postgres17_data volume
docker rm -f qp_track_db qp_track_redis

# Start the stack
docker compose up --build
```

Removing a container never deletes a named volume, so the database data is
safe. On start, Postgres finds the existing data and skips initialisation.

---

## 9. URLs

| What                         | URL                                                 |
| ---------------------------- | --------------------------------------------------- |
| Frontend                     | http://localhost:5173                               |
| Backend API                  | http://localhost:3001                               |
| Swagger docs                 | http://localhost:3001/docs                          |
| Postgres (from your machine) | `localhost:5435`, user `postgres`, db `qp_track_db` |
| Redis (from your machine)    | `localhost:6379`                                    |

---

## 10. Day-to-day commands

| Situation                      | Command                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| Start                          | `docker compose up` (add `-d` to run in the background)        |
| Edited code                    | Nothing - reloads automatically                                |
| Follow logs                    | `docker compose logs -f be fe`                                 |
| Check status                   | `docker compose ps`                                            |
| Restart backend only           | `docker compose restart be`                                    |
| Added a new migration          | `docker compose restart be` (migrations run on start)          |
| Run a command in the backend   | `docker compose exec be npm run migration:show --workspace=be` |
| Open a psql shell              | `docker exec -it qp_track_db psql -U postgres -d qp_track_db`  |
| Added / removed an npm package | `docker compose up --build -V` (see below)                     |
| Stop                           | `docker compose down` (data is kept)                           |

### After changing dependencies

`--build` alone is **not** enough. Compose keeps the old anonymous
`node_modules` volumes when it recreates containers, so a newly installed
package would not appear. Use:

```bash
docker compose up --build -V
```

`-V` (`--renew-anon-volumes`) replaces the `node_modules` volumes with fresh
ones from the new image. The Postgres data volume is not affected.

---

## 11. Data safety

These are **safe** and do not touch database data:

- `docker compose down`, `docker compose down -v`
- `docker rm -f qp_track_db`
- `docker compose up --build -V`

These **delete** the data. Avoid them:

- `docker volume rm postgres17_data`
- `docker volume prune -a` or `docker system prune --volumes` while no
  container is using the volume

Restore from a backup:

```bash
docker exec -i qp_track_db pg_restore -U postgres -d qp_track_db --clean < qp_track_backup.dump
```

---

## 12. Troubleshooting

| Symptom                                                                | Cause / fix                                                                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ECONNREFUSED be:3001` in `fe` logs right after start                  | Normal: the frontend starts before Nest finishes booting. It stops once `be` logs `Nest application successfully started`. |
| `localhost:3001` does not respond, but the frontend works              | Check the ports line of `be` is `"3001:3001"`. The second number must match `PORT` (3001).                                 |
| `container name "/qp_track_db" is already in use`                      | The old standalone container still exists - `docker rm -f qp_track_db qp_track_redis`.                                     |
| `port is already allocated`                                            | Something else is using 5435, 6379, 3001 or 5173 - stop it or change the host port (left number).                          |
| `Cannot find module` / `Cannot find package` after adding a dependency | Stale `node_modules` volume - `docker compose up --build -V`.                                                              |
| `[ObserveAgentWorker] Telemetry rejected (401)` in `be` logs           | The `@nestjs/observe` keys in `app.module.ts` are placeholders. Harmless in dev.                                           |
| Blank page in the browser                                              | A frontend JavaScript error - check the browser console. Docker is fine if the URLs in section 9 respond.                  |

---

## 13. More information

### 13.1 The shared `x-node-dev` block in `docker-compose.yml`

```yaml
x-node-dev: &node-dev
  build:
    context: .
    dockerfile: Dockerfile.dev
  image: qp_track-dev
  working_dir: /app
  volumes:
    - .:/app
    # Keep the container's (Linux-built) node_modules instead of the host's.
    - /app/node_modules
    - /app/apps/be/node_modules
    - /app/apps/fe/node_modules
    - /app/packages/shared-types/node_modules
  networks:
    - qp_track_network
```

This block holds the settings that the `be` and `fe` services share, written
once so they are not duplicated.

#### `x-node-dev: &node-dev`

- **`x-node-dev`**: any top-level key starting with `x-` is an **extension
  field**. Compose ignores it as a service, so it is just a place to keep
  reusable config.
- **`&node-dev`**: a YAML **anchor**, which names this block so it can be
  reused.

Both services pull it in with a **merge key**:

```yaml
be:
  <<: *node-dev          # paste in everything from the node-dev block
  container_name: qp_track_be
  command: ...
```

`be` and `fe` get the same build, image, volumes and network. Each service then
adds its own `command`, `ports` and `environment`.

#### `build` and `image`

```yaml
build:
  context: .                  # repo root (the shared lockfile lives here)
  dockerfile: Dockerfile.dev
image: qp_track-dev
```

This builds `Dockerfile.dev`, which copies only the `package.json` files and
runs `npm ci` (no source code), and tags the result `qp_track-dev`. Both
services use **the same image**, so it is built once. That works because in dev
the image only holds dependencies, and the code comes from your machine.

#### `working_dir: /app`

Commands such as `npm run dev --workspace=be` run from `/app`, the repo root
inside the container.

#### `volumes`: the important part

**1. `.:/app`: bind mount for live code**

This mounts your project folder over `/app` in the container. When you edit a
file in your IDE, the container sees the change immediately, so Nest watch mode
and Vite hot reload work. That is why you don't rebuild the image after code
changes.

**The problem:** this mount **covers up** everything at `/app` in the image,
including the `node_modules` that `npm ci` installed. The container would then
see your host's `node_modules` (or none, if you never ran `npm install`
locally). That breaks things, because:

- packages with native binaries (such as `bcrypt`, `esbuild` and Vite's Rollup)
  are compiled for a specific OS. Ones built on your host can be the wrong build
  for the container's Debian Linux, so you get errors like `invalid ELF header`
  or `Cannot find module @rollup/rollup-linux-x64-gnu`;
- the host's versions can drift from the lockfile.

**2. `/app/node_modules` etc.: anonymous volumes**

A volume entry with **only a container path** (no `host:` part) creates an
**anonymous volume** at that path. Docker applies more specific paths on top of
the bind mount, so these folders are hidden from the host and come from
Docker-managed volumes instead.

On first creation, Docker fills each empty volume with whatever the image has at
that path, which is the Linux-built `node_modules` from `npm ci`.

```
/app                                    ← your host folder (live code)
├── apps/be/src/...                     ← host
├── node_modules                        ← container's (from image)
├── apps/be/node_modules                ← container's
├── apps/fe/node_modules                ← container's
└── packages/shared-types/node_modules  ← container's
```

There is one per workspace because npm sometimes installs packages **inside a
workspace's own `node_modules`** rather than hoisting them to the root, for
example when two workspaces need different versions of the same package. Each of
those folders needs the same protection.

> `packages/eslint-config` and `packages/typescript-config` are not listed. If
> npm ever creates a `node_modules` inside one of them, the host's copy would
> show through. Add a line for it if that happens.

**Gotcha: adding a new dependency.** Anonymous volumes **persist** across
`docker compose up` and `down` (without `-v`). After you install a package,
rebuilding the image is not enough, because the old volume still covers the new
`node_modules`. Run `docker compose up --build -V`, where `-V`
(`--renew-anon-volumes`) refills the volumes from the new image (see section
10). If you forget, you get `Cannot find package 'xyz'` in the container, even
though it is in `package.json`.

#### `networks: qp_track_network`

This puts both services on the same network as `db` and `redis`, so they can
reach each other **by service name** (`DB_HOST: db`,
`REDIS_URL: redis://redis:6379`, `VITE_PROXY_TARGET: http://be:3001`) instead
of by IP address.

#### In short

The image provides Linux-built `node_modules`, the bind mount provides live
source code, and the anonymous volumes stop the bind mount from hiding the
image's `node_modules`.
