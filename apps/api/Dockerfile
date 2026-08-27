# Build context is the repository root, because the API depends on the
# @booking/shared workspace package.
#
#   docker build -f apps/api/Dockerfile .

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# --- dependencies -----------------------------------------------------------
# Only manifests are copied first, so this layer is reused whenever the lockfile
# has not changed.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @booking/api... --filter @booking/shared...

# --- build ------------------------------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @booking/shared build \
  && pnpm --filter @booking/api build

# Produce a self-contained directory with production dependencies only. --legacy
# copies the @booking/shared workspace package instead of symlinking it, which is
# what makes the result standalone; the alternative, injected workspace packages,
# would also stop the local dev loop from picking up changes to shared.
RUN pnpm --filter @booking/api --prod deploy --legacy /deploy

# --- runtime ----------------------------------------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# The source label is what lets GitHub Container Registry associate the package
# with the repository and inherit its visibility.
LABEL org.opencontainers.image.source="https://github.com/DenislavMladenov/HairDresser_booking_platform"
LABEL org.opencontainers.image.title="Barber booking API"
LABEL org.opencontainers.image.description="NestJS REST API for the barber shop booking platform"
LABEL org.opencontainers.image.licenses="UNLICENSED"

# tini reaps zombies and forwards signals, so Nest's shutdown hooks actually run.
RUN apk add --no-cache tini

COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /deploy/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
# Needed at start time to apply pending migrations.
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/prisma.config.ts ./prisma.config.ts
COPY --chmod=755 apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# The node image ships an unprivileged user; nothing here needs root.
USER node

EXPOSE 3000

# Compose restarts the container if this ever reports unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
