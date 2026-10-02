# Production image for the Nest backend. Build from the repo root:
#   docker build -f apps/be/Dockerfile .
# (npm workspaces share one root lockfile, so the context must be the root.)

FROM node:24-bookworm-slim AS base
RUN npm install -g npm@11.12.1
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY apps/be/package.json apps/be/
COPY apps/fe/package.json apps/fe/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/

FROM base AS build
RUN npm ci
COPY packages packages
COPY apps/be apps/be
RUN npm run build --workspace=be

FROM base AS prod-deps
RUN npm ci --omit=dev --workspace=be

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app ./
COPY --from=build --chown=node:node /app/apps/be/dist apps/be/dist
WORKDIR /app/apps/be
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
