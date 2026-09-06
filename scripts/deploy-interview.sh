#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PROJECT_NAME="${PROJECT_NAME:-tutoringapp-interview}"

if [[ -n "${ENV_FILE:-}" ]]; then
  ENV_FILE="$ENV_FILE"
elif [[ -f .env ]]; then
  ENV_FILE=.env
else
  ENV_FILE=.env.example
fi

compose() {
  docker compose \
    --env-file "$ENV_FILE" \
    -p "$PROJECT_NAME" \
    -f docker-compose.yml \
    -f docker-compose.interview.yml \
    "$@"
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-180}"
  local elapsed=0

  until curl -fsS "$url" >/dev/null 2>&1; do
    if (( elapsed >= timeout_seconds )); then
      echo "Timed out waiting for $url" >&2
      compose ps
      exit 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
}

echo "Pulling published application images..."
compose pull backend frontend cloudflared

echo "Starting the interview environment..."
compose up -d --no-build

BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-5050}"
NGINX_HOST_PORT="${NGINX_HOST_PORT:-8443}"

wait_for_url "http://localhost:${BACKEND_HOST_PORT}/health"

echo "Applying database migrations..."
compose exec -T backend pnpm exec prisma migrate deploy

wait_for_url "http://localhost:${NGINX_HOST_PORT}/api/v1/health"

echo "Waiting for the Cloudflare Quick Tunnel URL..."
for _ in {1..30}; do
  TUNNEL_URL="$(compose logs --no-color cloudflared 2>/dev/null | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -n 1 || true)"
  if [[ -n "$TUNNEL_URL" ]]; then
    echo "Deployment healthy."
    echo "Interview URL: $TUNNEL_URL"
    exit 0
  fi
  sleep 2
done

echo "Application is healthy, but the tunnel URL was not found in time." >&2
compose logs --tail=50 cloudflared
exit 1
