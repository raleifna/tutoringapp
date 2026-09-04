#!/usr/bin/env bash

set -euo pipefail

docker compose \
  --env-file "${ENV_FILE:-.env}" \
  -p "${PROJECT_NAME:-tutoringapp-interview}" \
  -f docker-compose.yml \
  -f docker-compose.interview.yml \
  logs --no-color cloudflared 2>/dev/null \
  | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' \
  | tail -n 1
