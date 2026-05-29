#!/usr/bin/env bash
# reset-db.sh — wipe the local Postgres volume and re-apply migrations 001–027
# plus seed data.
#
# Why this exists:
#   Migrations are applied by mounting `./migrations` into Postgres'
#   /docker-entrypoint-initdb.d, which only runs on a *clean* data volume.
#   Once the volume exists, new migration files are ignored. After every
#   `git pull` that adds a 0NN_*.sql, run this script to get back to parity.
#
# Use:
#   bash scripts/reset-db.sh
#
# This DESTROYS local data — do not run against a volume that holds work
# you want to keep.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "[reset-db] Stopping containers and removing volumes…"
docker-compose down -v

echo "[reset-db] Booting postgres + redis + minio…"
docker-compose up -d postgres redis minio

echo "[reset-db] Waiting for postgres to become healthy…"
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker-compose ps -q postgres)" 2>/dev/null || echo starting)" = "healthy" ]; do
  sleep 2
done

echo "[reset-db] Booting microservices…"
docker-compose up -d

echo "[reset-db] Done. Migrations 001–027 applied, seed (003_seed_gen1.sql) loaded."
echo "[reset-db] Tail logs with: docker-compose logs -f gateway-service"
