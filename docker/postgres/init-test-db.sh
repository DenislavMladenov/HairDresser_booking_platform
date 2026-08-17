#!/bin/sh
# Creates the database used by the integration test suite, so tests never touch
# development data. Runs only on first initialisation of the data volume.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE ${POSTGRES_DB}_test OWNER $POSTGRES_USER;
EOSQL
