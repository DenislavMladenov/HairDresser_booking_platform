# Backups and restore

Appointments, customer contact details and the shop's configuration all live in
PostgreSQL. Everything else in the stack can be rebuilt from the repository, so
the database is the only thing that genuinely needs backing up.

A backup you have never restored is not a backup. Run the drill in the last
section at least once.

## What to back up

| Data                        | Where               | How                           |
| --------------------------- | ------------------- | ----------------------------- |
| Appointments, config, users | PostgreSQL          | `pg_dump`, described below    |
| TLS certificates            | `caddy-data` volume | Nothing; Caddy re-issues them |
| Application code            | Git                 | Push to a remote              |
| Secrets                     | `.env` on the VM    | Your password manager         |

`.env` is not in git by design. Without `POSTGRES_PASSWORD` a dump is still
restorable, but keep the file safe anyway.

## Taking a backup

The helper script produces a compressed custom-format dump, prunes old ones and
verifies the result is readable:

```bash
./scripts/backup-database.sh
```

Or by hand:

```bash
docker compose exec -T postgres \
  pg_dump -U booking -d booking --format=custom --compress=9 \
  > "booking-$(date +%F-%H%M).dump"
```

The custom format is compressed, allows selective restore and works with
`pg_restore`. A plain SQL dump is easier to inspect but larger and less flexible.

## Automating it

Install the script and a nightly cron entry:

```bash
sudo install -m 755 /opt/booking/scripts/backup-database.sh /usr/local/bin/booking-backup
sudo mkdir -p /var/backups/booking
sudo crontab -e
```

```cron
# Nightly at 03:15, well outside opening hours.
15 3 * * * cd /opt/booking && BACKUP_DIR=/var/backups/booking /usr/local/bin/booking-backup >> /var/log/booking-backup.log 2>&1
```

Check afterwards that the log is being written and that dumps are appearing.

## Getting copies off the VM

A backup on the same machine as the database does not protect against the machine
being lost. Choose one, from the VM's side so no inbound access is needed:

```bash
# To another host over SSH, keyed authentication, no password prompts.
rsync -az --delete /var/backups/booking/ backups@nas.local:/backups/booking/

# Or to any S3-compatible or remote target with rclone.
rclone sync /var/backups/booking remote:booking-backups
```

Add it to the same cron entry, after the backup command, so a failed backup does
not silently overwrite good remote copies:

```cron
15 3 * * * cd /opt/booking && BACKUP_DIR=/var/backups/booking /usr/local/bin/booking-backup && rsync -az --delete /var/backups/booking/ backups@nas.local:/backups/booking/ >> /var/log/booking-backup.log 2>&1
```

Proxmox-level backups of the whole VM complement this. They restore faster, but a
snapshot taken while PostgreSQL is writing can contain a torn state, so keep the
dumps as the authoritative copy.

## Restoring

Into the existing stack, replacing current data. This is destructive; take a dump
of the current state first if there is any doubt.

```bash
cd /opt/booking

# 1. Stop the API so nothing writes while the restore runs. Leave Postgres up.
docker compose stop api

# 2. Recreate an empty database.
docker compose exec -T postgres psql -U booking -d postgres -c 'DROP DATABASE booking;'
docker compose exec -T postgres psql -U booking -d postgres -c 'CREATE DATABASE booking OWNER booking;'

# 3. Load the dump.
docker compose exec -T postgres pg_restore -U booking -d booking --no-owner < booking-2026-08-17-0315.dump

# 4. Start the API. It applies any migrations the dump predates.
docker compose start api
docker compose logs -f api
```

Then check `/api/health`, sign in, and confirm that today and an upcoming day look
right.

## Rehearsing a restore safely

Restore into a throwaway database rather than the live one:

```bash
docker compose exec -T postgres psql -U booking -d postgres -c 'CREATE DATABASE restore_test OWNER booking;'
docker compose exec -T postgres pg_restore -U booking -d restore_test --no-owner < booking-2026-08-17-0315.dump

# Sanity check the contents.
docker compose exec -T postgres psql -U booking -d restore_test -c 'SELECT count(*) FROM "Booking";'
docker compose exec -T postgres psql -U booking -d restore_test -c 'SELECT count(*) FROM "Service";'

# Confirm the overlap constraint survived the round trip.
docker compose exec -T postgres psql -U booking -d restore_test \
  -c "SELECT conname FROM pg_constraint WHERE conname = 'booking_no_overlap';"

docker compose exec -T postgres psql -U booking -d postgres -c 'DROP DATABASE restore_test;'
```

That last check matters: the exclusion constraint is what prevents double
booking, so a restore that lost it would leave the system quietly unsafe.

## If the VM is gone

1. Create a new Debian VM and install Docker, per
   [deployment.md](deployment.md).
2. Clone the repository and restore `.env` from your password manager.
3. `docker compose up -d --build`, which creates an empty database and applies
   migrations.
4. Restore the newest dump with the steps above.
5. Point DNS at the new address. Caddy issues a fresh certificate automatically.
