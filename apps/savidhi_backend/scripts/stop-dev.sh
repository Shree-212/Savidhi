#!/usr/bin/env bash
set -euo pipefail

CLEAN=false
VOLUMES=false

for arg in "$@"; do
  case $arg in
    --clean)   CLEAN=true ;;
    --volumes) VOLUMES=true ;;
  esac
done

echo "🛑 Stopping Savidhi backend..."

if [ "$VOLUMES" = true ]; then
  docker-compose down -v
  echo "🗑️  Removed containers and volumes."
elif [ "$CLEAN" = true ]; then
  docker-compose down
  echo "🗑️  Removed containers."
else
  docker-compose stop
  echo "✅ Services stopped (containers preserved)."
fi
