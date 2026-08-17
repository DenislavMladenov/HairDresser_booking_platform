# Builds the SPA and bakes it into a Caddy image, so the web tier is a single
# immutable artefact with no volume to keep in sync.
#
# Build context is the repository root:
#   docker build -f apps/web/Dockerfile .

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @booking/web... --filter @booking/shared...

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @booking/shared build \
  && pnpm --filter @booking/web build

FROM caddy:2-alpine AS runtime
COPY --from=build /repo/apps/web/dist /srv
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1/healthz || exit 1
