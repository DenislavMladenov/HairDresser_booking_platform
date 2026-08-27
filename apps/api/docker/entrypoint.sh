#!/bin/sh
# Resolves credentials, applies pending migrations, then hands over to the API.
#
# `migrate deploy` only ever applies committed migration files and never
# generates or resets anything, so it is safe on every start. Doing it here makes
# a deployment a single `compose up -d`. That is also why the Prisma CLI and
# dotenv are runtime dependencies of the API rather than dev dependencies.
#
# The migration is retried rather than attempted once, because the database may
# not be accepting connections yet. Compose can express that with a health
# condition, but not every implementation honours it, so the container does not
# rely on being started in the right order.
set -eu

. /usr/local/lib/booking/resolve-secrets.sh

DATABASE_WAIT_ATTEMPTS="${DATABASE_WAIT_ATTEMPTS:-40}"
attempt=1

echo 'Applying database migrations...'

until ./node_modules/.bin/prisma migrate deploy; do
  if [ "$attempt" -ge "$DATABASE_WAIT_ATTEMPTS" ]; then
    echo "Database unreachable after $attempt attempts; giving up." >&2
    exit 1
  fi

  echo "Database not ready yet; retrying in 3s (attempt $attempt of $DATABASE_WAIT_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep 3
done

echo 'Starting API...'
exec "$@"
