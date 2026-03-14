#!/usr/bin/env bash
set -euo pipefail

REBUILD=false
SKIP_VERIFY=false

for arg in "$@"; do
  case $arg in
    --rebuild)     REBUILD=true ;;
    --skip-verify) SKIP_VERIFY=true ;;
  esac
done

echo "🚀 Starting Savidhi backend (development)..."

if [ "$REBUILD" = true ]; then
  echo "🔨 Rebuilding Docker images..."
  docker-compose build
fi

docker-compose up -d

if [ "$SKIP_VERIFY" = false ]; then
  echo "⏳ Waiting for services to become healthy..."
  sleep 10
  docker-compose ps
fi

echo "✅ Backend is running."
echo "  Gateway:  http://localhost:4000"
echo "  Auth:     http://localhost:4001"
echo "  User:     http://localhost:4002"
echo "  Postgres: localhost:5432"
echo "  Redis:    localhost:6379"
