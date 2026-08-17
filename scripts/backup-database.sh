#!/usr/bin/env bash
# Backs up the booking database from the running Compose stack.
#
# Produces a compressed custom-format dump, verifies it is readable, and removes
# dumps older than the retention window. Run from the repository root, or set
# COMPOSE_DIR.
#
#   ./scripts/backup-database.sh
#   BACKUP_DIR=/var/backups/booking RETENTION_DAYS=30 ./scripts/backup-database.sh
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
POSTGRES_USER="${POSTGRES_USER:-booking}"
POSTGRES_DB="${POSTGRES_DB:-booking}"

cd "$COMPOSE_DIR"

# Read the database credentials from .env without exporting everything in it.
if [ -f .env ]; then
  POSTGRES_USER="$(sed -n 's/^POSTGRES_USER=//p' .env | tail -1 || echo "$POSTGRES_USER")"
  POSTGRES_DB="$(sed -n 's/^POSTGRES_DB=//p' .env | tail -1 || echo "$POSTGRES_DB")"
fi

mkdir -p "$BACKUP_DIR"
target="$BACKUP_DIR/booking-$(date +%Y-%m-%d-%H%M).dump"

echo "Backing up database '$POSTGRES_DB' to $target"

# -T because there is no terminal in a cron job.
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=9 \
  > "$target"

if [ ! -s "$target" ]; then
  echo "Backup file is empty; removing it and failing." >&2
  rm -f "$target"
  exit 1
fi

# A dump that pg_restore cannot list is not a backup.
if ! docker compose exec -T postgres pg_restore --list < "$target" > /dev/null; then
  echo "Backup at $target is not readable by pg_restore; failing." >&2
  exit 1
fi

chmod 600 "$target"
echo "Backup verified: $(du -h "$target" | cut -f1)"

echo "Removing dumps older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name 'booking-*.dump' -type f -mtime "+$RETENTION_DAYS" -print -delete

echo "Done. Remember that copies must also leave this machine; see docs/backup-and-restore.md"
