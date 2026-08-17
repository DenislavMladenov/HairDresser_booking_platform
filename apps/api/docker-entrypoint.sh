#!/bin/sh
# Applies pending migrations, then hands over to the API process.
#
# `migrate deploy` only ever applies committed migration files and never
# generates or resets anything, so it is safe to run on every start. Doing it
# here means a deployment is a single `docker compose up -d`.
#
# This is why the Prisma CLI and dotenv are runtime dependencies of the API
# rather than dev dependencies: the CLI applies the migrations and
# prisma.config.ts reads the connection string through dotenv.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set; the API cannot start." >&2
  exit 1
fi

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting API..."
exec "$@"
