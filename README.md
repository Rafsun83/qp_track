# my-turborepo

A Turborepo monorepo with a NestJS backend and a Vite/React frontend, sharing a common UI component library.

## What's inside?

### Apps

- `apps/be` (`be`) — [NestJS](https://nestjs.com/) backend, ESM, listens on `process.env.PORT` (default `3000`)
- `apps/fe` (`fe`) — [Vite](https://vite.dev/) + [React 19](https://react.dev/) frontend

### Packages

- `@repo/shared-types` — shared React component library, consumed by both `be` and `fe`
- `@repo/eslint-config` — shared ESLint configurations
- `@repo/typescript-config` — shared `tsconfig.json` bases

Everything is TypeScript.

## Prerequisites

- Node.js >= 24
- npm 11.12.1 (pinned in `package.json` → `devEngines.packageManager`)

This repo uses **npm workspaces**, not pnpm/yarn/bun — always run `npm install` from the repo root, never inside an individual `apps/*` or `packages/*` folder. Internal package dependencies use the plain `"*"` version range (e.g. `"@repo/shared-types": "*"`); the `workspace:*` protocol is not supported by npm and will break installs.

## Getting started

```sh
npm install
npm run dev
```

`npm run dev` runs `turbo run dev`, which starts both apps in parallel with prefixed logs:

- `fe` — Vite dev server (prints its local URL, typically `http://localhost:5173`)
- `be` — NestJS in watch mode on `http://localhost:3000`

To run just one app, either filter by package name or use Turbo's `package#task` syntax:

```sh
npx turbo run dev --filter=fe
npx turbo run dev --filter=be

# equivalent shorthand
npx turbo run fe#dev
npx turbo run be#dev
```

## Common scripts

Run from the repo root (they fan out to every workspace via Turbo):

```sh
npm run build         # turbo run build
npm run lint          # turbo run lint
npm run check-types   # turbo run check-types
npm run format        # prettier --write across the repo
```

Backend-specific commands (see `apps/be/CLAUDE.md` for the full list):

```sh
cd apps/be
npm run test          # unit tests (Vitest)
npm run test:e2e      # e2e tests
npm run test:cov      # unit tests with coverage
```

## Project structure

```
apps/
  be/     NestJS backend
  fe/     Vite + React frontend
packages/
  shared-types/       shared React components (@repo/shared-types)
  eslint-config/       shared ESLint config (@repo/eslint-config)
  typescript-config/   shared tsconfig bases (@repo/typescript-config)
```

## Remote Caching

Turborepo caches locally by default. To share build caches across machines/CI via [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching), authenticate and link the repo to a [Vercel](https://vercel.com/signup?utm_source=turborepo-examples) account:

```sh
npx turbo login
npx turbo link
```

## Useful links

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)

1. frontend
2. backend
3. database
4. redis
   All service will be run in under the one network.
