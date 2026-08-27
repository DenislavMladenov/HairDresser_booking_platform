# Barber shop booking platform

A self-hosted booking system for a single-barber shop. Customers pick a service
and a free time slot without creating an account; the barber signs in to manage
the day, the schedule and the service list.

Built to run on one small machine: a Debian VM under Proxmox, three containers,
no external services.

## What it does

Customers can:

- browse the services on offer with duration and price,
- see only the times that are genuinely free for the service they chose,
- book with a name and phone number, and get an immediate confirmation.

The barber can:

- see today at a glance, browse a week, and search appointments by date and status,
- confirm, complete, cancel or mark a no-show, and move an appointment to another time,
- add walk-ins manually, outside the normal rules where necessary,
- edit private notes on an appointment,
- set weekly opening hours and breaks, block one-off periods or whole days,
- manage services and the booking policy.

## Technology

| Layer    | Choice                                                           |
| -------- | ---------------------------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS, TanStack Query, React Router       |
| Backend  | NestJS 11, REST, Prisma 7                                        |
| Database | PostgreSQL 17                                                    |
| Edge     | Caddy, automatic HTTPS, serves the built SPA and proxies the API |
| Runtime  | Docker Compose on a Debian VM                                    |

TypeScript throughout, in a pnpm workspace:

```
apps/api        NestJS REST API
apps/web        React single page app
packages/shared API contract types shared by both
docker/         Caddy configuration and Postgres init scripts
docs/           deployment, backups, architecture decisions
```

## Two guarantees worth knowing about

Double booking is prevented by PostgreSQL, not by application code. A GiST
exclusion constraint rejects any appointment whose time range overlaps an
existing one, so two simultaneous requests cannot both succeed no matter how the
application behaves. See [docs/architecture.md](docs/architecture.md).

Availability is decided only by the server. The frontend renders the slots the
API returns and the API re-derives them when a booking is submitted, so a stale
page or a hand-crafted request cannot book a time that was never offered.

## Running it locally

Requirements: Node.js 22 or newer, pnpm 11, Docker.

```bash
pnpm install
cp .env.example .env          # then fill in the secrets, see below
pnpm db:up                    # PostgreSQL on 127.0.0.1:5433
pnpm db:migrate               # apply migrations
pnpm db:seed                  # working hours, booking policy, example services

# Create the first admin account. Never pass the password as an argument.
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long unique password' pnpm bootstrap:admin

pnpm dev                      # API on :3000, web on :5173
```

Open http://localhost:5173 to book, and http://localhost:5173/admin/login to
sign in. The Vite dev server proxies `/api`, so cookies behave exactly as they do
in production.

Generate the two required secrets with:

```bash
openssl rand -base64 36   # SESSION_SECRET
openssl rand -base64 18   # POSTGRES_PASSWORD
```

Every variable is documented in [.env.example](.env.example). Secrets are never
committed; `.env` is ignored by git.

## Commands

| Command                  | What it does                                        |
| ------------------------ | --------------------------------------------------- |
| `pnpm dev`               | API and web dev servers together                    |
| `pnpm build`             | Build every package                                 |
| `pnpm typecheck`         | Type check every package                            |
| `pnpm lint`              | ESLint across the workspace                         |
| `pnpm test`              | Unit tests, no database needed                      |
| `pnpm test:integration`  | Integration tests against the `booking_test` schema |
| `pnpm db:up` / `db:down` | Start or stop the development database              |
| `pnpm db:migrate`        | Create and apply a migration                        |
| `pnpm db:seed`           | Idempotent baseline data                            |
| `pnpm bootstrap:admin`   | Create or reset the admin account                   |
| `pnpm format`            | Prettier                                            |
| `pnpm format:eol`        | Normalise line endings to LF                        |

## Tests

Unit tests cover the slot calculator, the timezone handling across both daylight
saving transitions, and the booking status rules. Integration tests run a real
application against a real database and cover authentication, CSRF, availability
rules, booking rules, privacy of customer data, and concurrency: ten clients
racing for one slot must produce exactly one appointment.

```bash
pnpm test                 # 42 unit tests
pnpm test:integration     # 106 integration tests, needs pnpm db:up
```

## Deploying

Any host with Docker, in an empty directory:

```bash
curl -fsSLO https://raw.githubusercontent.com/DenislavMladenov/HairDresser_booking_platform/main/compose.yml
docker compose up -d

docker compose exec api booking seed
docker compose exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... api booking bootstrap-admin
```

That is all of it. No `.env`, no domain, no origin configuration: the database
password and session secret are generated on first start, migrations are applied
by the API as it starts, and the app answers on port 80 at whatever address the
host has. Set `DOMAIN` to a real hostname when you want automatic HTTPS.

### From nothing to running, step by step

Written for a fresh Rocky, Alma or RHEL machine. For Debian or Ubuntu only the
first two steps differ; see [docs/deployment.md](docs/deployment.md).

Install Docker, then log out and back in so the group membership applies:

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

If `config-manager --add-repo` is rejected, the machine has dnf5 and the form is
`sudo dnf config-manager addrepo --from-repofile=<the same url>`.

Open port 80 in firewalld, which is enabled by default on this family, and check
that nothing already holds it:

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
sudo ss -ltnp | grep :80        # should print nothing
```

SELinux needs no attention: the stack uses only named volumes, so there is
nothing to relabel.

Fetch the compose file and start:

```bash
sudo mkdir -p /opt/booking && sudo chown "$USER":"$USER" /opt/booking
cd /opt/booking
curl -fsSLO https://raw.githubusercontent.com/DenislavMladenov/HairDresser_booking_platform/main/compose.yml

docker compose up -d
docker compose ps               # wait for api and caddy to report healthy
```

The first start pulls about 190 MB, generates the credentials and applies the
migrations by itself.

Add the baseline schedule and your account:

```bash
docker compose exec api booking seed

read -rsp 'Password: ' PW && echo
docker compose exec -e ADMIN_EMAIL='you@example.com' -e ADMIN_PASSWORD="$PW" \
  api booking bootstrap-admin
unset PW
```

The password must be at least 12 characters. `read -rsp` keeps it out of your
shell history, and the script reads it from the environment rather than an
argument, which would be visible in the process list.

Check it, and find the address to open:

```bash
curl -fsS http://localhost/api/health     # {"status":"ok","database":"up"}
hostname -I
```

From another machine on the network, the booking page is at `http://<address>`
and the dashboard at `http://<address>/admin/login`.

One thing to do first in the dashboard: open Services and add the real ones. The
seed deliberately creates no example services in production, and until at least
one exists the public page has nothing to offer, which is expected rather than a
fault.

### With Podman instead of Docker

Runs the same, and was tested rootless on Podman 5.8. Nothing in the stack depends
on being started in a particular order: each container waits for what it needs.

```bash
sudo dnf -y install podman
systemctl --user enable --now podman.socket    # easiest step to forget

# Rootless cannot bind ports below 1024.
printf 'HTTP_PORT=8080\n' > .env

podman compose up -d
podman compose exec api booking seed
```

The app is then on port 8080 rather than 80, which it handles by itself because it
derives its expected origin from the request.

Rootless containers do not come back after a reboot on their own:

```bash
loginctl enable-linger "$USER"
systemctl --user enable --now podman-restart.service
```

If containers fail with `netavark ... nftables error`, the kernel has incomplete
nftables support, which is typical in WSL. That and the choice of Compose provider
are covered in [docs/deployment.md](docs/deployment.md).

### Running it

```bash
cd /opt/booking

docker compose logs -f api                     # follow what is happening
docker compose logs --tail 50 api              # the first place to look on a fault
docker compose restart api
docker compose down                            # stops; data survives
docker compose pull && docker compose up -d    # update to a new release
```

Everything comes back by itself after a reboot: the Docker service is enabled and
the containers are declared `restart: unless-stopped`.

To pin an exact build instead of following `latest`, create a `.env` next to
`compose.yml` containing `IMAGE_TAG=1.1.1`. Nothing else belongs there; every
other value has a working default. Do not copy the development `.env` from this
repository to a server, since it points at a database on your own machine.

New images are published by pushing a `v*` git tag, which builds them in GitHub
Actions. To build rather than pull, layer the build overrides:
`docker compose -f compose.yml -f compose.build.yml up -d --build`.

PostgreSQL publishes no ports and sits on a network the public-facing container
cannot reach. See [docs/deployment.md](docs/deployment.md) for a domain with
HTTPS, and [docs/backup-and-restore.md](docs/backup-and-restore.md) for backups,
which are not automatic and matter as soon as the shop relies on this.

## Security

- Passwords are hashed with Argon2id using the OWASP recommended parameters.
- Sessions are server side. The cookie holds a random opaque token; only its
  SHA-256 hash is stored, so a database dump yields no usable sessions. The
  cookie is HttpOnly, signed, SameSite=Lax and Secure in production.
- State-changing requests need a matching Origin and a double-submit CSRF token.
- Login is limited to five attempts per quarter hour per client, public booking
  to ten per hour.
- Every input is validated server side; unknown properties are rejected rather
  than ignored.
- Admin endpoints are guarded by session and role checks on the server. The UI
  hiding a button is never the control.
- Customer names, phone numbers, emails and notes are returned only to an
  authenticated barber. The public API exposes availability and nothing else.
- Stack traces are never returned in production.

## Designed to grow

Not built yet, but the data model does not stand in the way of multiple barbers
or locations, customer accounts, reminders, payments or reporting. The notes in
[docs/architecture.md](docs/architecture.md) explain which decisions would need
revisiting for each.
