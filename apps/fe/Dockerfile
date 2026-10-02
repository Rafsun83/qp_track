# Production image for the React frontend: static build served by nginx,
# which also proxies API/WebSocket traffic to `be`. Build from the repo root:
#   docker build -f apps/fe/Dockerfile .

FROM node:24-bookworm-slim AS build
RUN npm install -g npm@11.12.1
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY apps/be/package.json apps/be/
COPY apps/fe/package.json apps/fe/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN npm ci
COPY packages packages
COPY apps/fe apps/fe
RUN npm run build --workspace=fe

FROM nginx:1.27-alpine AS runtime
COPY apps/fe/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/fe/dist /usr/share/nginx/html
EXPOSE 80
