#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Setting up Savidhi backend..."

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "❌  docker is required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌  docker-compose is required"; exit 1; }

# Copy .env.example if .env doesn't exist
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example — please update secrets before continuing."
  else
    echo "⚠️  No .env file found. Create one based on docker-compose.yml environment vars."
  fi
fi

# Install service dependencies
for service in auth-service gateway-service user-service; do
  if [ -d "services/$service" ]; then
    echo "📦 Installing $service dependencies..."
    (cd "services/$service" && npm install)
  fi
done

echo "✅ Setup complete. Run 'npm run start-dev' to start all services."
