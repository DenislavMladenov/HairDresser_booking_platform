#!/bin/sh
# Resolves credentials, applies pending migrations, then hands over to the API.
#
# `migrate deploy` only ever applies committed migration files and never
# generates or resets anything, so it is safe on every start. Doing it here makes
# a deployment a single `docker compose up -d`. That is also why the Prisma CLI
# and dotenv are runtime dependencies of the API rather than dev dependencies.
set -eu

. /usr/local/lib/booking/resolve-secrets.sh

echo 'Applying database migrations...'
./node_modules/.bin/prisma migrate deploy

echo 'Starting API...'
exec "$@"
