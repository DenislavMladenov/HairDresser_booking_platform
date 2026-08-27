#!/bin/sh
# Operator commands, with credentials resolved the same way the API resolves them.
# `docker compose exec` bypasses the entrypoint, so without this the one-off
# scripts would start with no database connection.
#
#   docker compose exec api booking seed
#   docker compose exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... api booking bootstrap-admin
#   docker compose exec api booking migrate
set -eu

. /usr/local/lib/booking/resolve-secrets.sh

case "${1:-}" in
  seed)
    exec node dist/scripts/seed.js
    ;;
  bootstrap-admin)
    exec node dist/scripts/bootstrap-admin.js
    ;;
  migrate)
    exec ./node_modules/.bin/prisma migrate deploy
    ;;
  *)
    echo 'Usage: booking {seed|bootstrap-admin|migrate}' >&2
    exit 2
    ;;
esac
