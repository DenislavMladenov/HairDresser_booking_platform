# Resolves credentials from the files Compose generates, unless they were already
# supplied through the environment. Meant to be sourced, not executed.
#
# This exists so the stack can start with nothing configured: a password and a
# session secret are created once into a volume, and every process in the
# container picks them up the same way.

resolve_secret_file() {
  if [ ! -f "$1" ]; then
    echo "Secret file $1 is missing." >&2
    exit 1
  fi

  cat "$1"
}

if [ -z "${SESSION_SECRET:-}" ] && [ -n "${SESSION_SECRET_FILE:-}" ]; then
  SESSION_SECRET="$(resolve_secret_file "$SESSION_SECRET_FILE")"
  export SESSION_SECRET
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -z "${DATABASE_PASSWORD_FILE:-}" ]; then
    echo 'Neither DATABASE_URL nor DATABASE_PASSWORD_FILE is set; cannot reach the database.' >&2
    exit 1
  fi

  _password="$(resolve_secret_file "$DATABASE_PASSWORD_FILE")"
  DATABASE_URL="postgresql://${POSTGRES_USER:-booking}:${_password}@${POSTGRES_HOST:-postgres}:5432/${POSTGRES_DB:-booking}?schema=public"
  export DATABASE_URL
  unset _password
fi
