# Resolves credentials from the files the stack generates, unless they were
# already supplied through the environment. Meant to be sourced, not executed.
#
# This exists so the stack can start with nothing configured: a password and a
# session secret are created once into a volume, and every process in the
# container picks them up the same way.
#
# The files are waited for rather than required immediately, because not every
# Compose implementation honours `depends_on` conditions. Podman's in particular
# may start this container before the one that generates them, and correctness
# should not depend on which implementation is in use.

SECRET_WAIT_SECONDS="${SECRET_WAIT_SECONDS:-60}"

wait_for_file() {
  waited=0

  while [ ! -s "$1" ]; do
    if [ "$waited" -ge "$SECRET_WAIT_SECONDS" ]; then
      echo "Gave up waiting for $1 after ${SECRET_WAIT_SECONDS}s." >&2
      exit 1
    fi

    [ "$waited" -eq 0 ] && echo "Waiting for $1 to be created..."
    sleep 2
    waited=$((waited + 2))
  done
}

if [ -z "${SESSION_SECRET:-}" ] && [ -n "${SESSION_SECRET_FILE:-}" ]; then
  wait_for_file "$SESSION_SECRET_FILE"
  SESSION_SECRET="$(cat "$SESSION_SECRET_FILE")"
  export SESSION_SECRET
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -z "${DATABASE_PASSWORD_FILE:-}" ]; then
    echo 'Neither DATABASE_URL nor DATABASE_PASSWORD_FILE is set; cannot reach the database.' >&2
    exit 1
  fi

  wait_for_file "$DATABASE_PASSWORD_FILE"
  _password="$(cat "$DATABASE_PASSWORD_FILE")"
  DATABASE_URL="postgresql://${POSTGRES_USER:-booking}:${_password}@${POSTGRES_HOST:-postgres}:5432/${POSTGRES_DB:-booking}?schema=public"
  export DATABASE_URL
  unset _password
fi
