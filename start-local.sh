#!/usr/bin/env bash

set -euo pipefail

FORCE_SEED=false
SKIP_SEED=false
RUN_SMOKE_TEST=false
PROJECT_NAME="tutorconnect"
ENV_FILE=".env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-seed)
      FORCE_SEED=true
      shift
      ;;
    --skip-seed)
      SKIP_SEED=true
      shift
      ;;
    --run-smoke-test)
      RUN_SMOKE_TEST=true
      shift
      ;;
    --project-name)
      PROJECT_NAME="${2:?Missing value for --project-name}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:?Missing value for --env-file}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

write_step() {
  echo "==> $1"
}

ensure_command() {
  local name="$1"
  local hint="$2"

  if ! command -v "$name" >/dev/null 2>&1; then
    echo "$name not found. $hint" >&2
    exit 1
  fi
}

ensure_root_env() {
  local env_file_name="$1"
  local env_file="$PROJECT_ROOT/$env_file_name"
  local env_example="$PROJECT_ROOT/.env.example"

  if [[ ! -f "$env_file" ]]; then
    if [[ ! -f "$env_example" ]]; then
      echo "Missing .env and .env.example." >&2
      exit 1
    fi

    cp "$env_example" "$env_file"
    echo "Created $env_file_name from .env.example"
  fi

  printf '%s\n' "$env_file"
}

get_env_value() {
  local env_file_path="$1"
  local name="$2"
  local default_value="$3"

  if [[ ! -f "$env_file_path" ]]; then
    printf '%s\n' "$default_value"
    return
  fi

  local match
  match="$(grep -E "^[[:space:]]*${name}[[:space:]]*=" "$env_file_path" | head -n 1 || true)"
  if [[ -z "$match" ]]; then
    printf '%s\n' "$default_value"
    return
  fi

  match="${match#*=}"
  match="${match%\"}"
  match="${match#\"}"
  match="${match%\'}"
  match="${match#\'}"
  printf '%s\n' "$match"
}

invoke_compose() {
  docker compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" "$@"
}

invoke_backend_command() {
  docker compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" exec -T backend "$@"
}

backend_has_script() {
  local script_name="$1"

  node -e 'const fs = require("fs"); const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(pkg.scripts && pkg.scripts[process.argv[2]] ? 0 : 1);' \
    "$PROJECT_ROOT/backend/package.json" "$script_name"
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-180}"
  local elapsed=0

  while [[ "$elapsed" -lt "$timeout_seconds" ]]; do
    local status_code
    status_code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    if [[ "$status_code" =~ ^[234][0-9][0-9]$ ]]; then
      return
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "Timed out waiting for $url" >&2
  exit 1
}

get_user_count() {
  local script
  script='const { PrismaClient } = require("@prisma/client"); const prisma = new PrismaClient(); prisma.user.count().then((count) => { console.log(count); }).catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });'

  local output
  output="$(docker compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" exec -T backend node -e "$script")"
  printf '%s\n' "$output" | tail -n 1 | tr -d '[:space:]'
}

sync_database_schema() {
  write_step "Synchronizing Prisma schema with the database"
  invoke_backend_command pnpm exec prisma db push --accept-data-loss
}

ensure_command docker "Install Docker Desktop and make sure the daemon is running."
ENV_FILE_PATH="$(ensure_root_env "$ENV_FILE")"
BACKEND_HOST_PORT="$(get_env_value "$ENV_FILE_PATH" "BACKEND_HOST_PORT" "5050")"
GATEWAY_HOST_PORT="$(get_env_value "$ENV_FILE_PATH" "NGINX_HOST_PORT" "8080")"

write_step "Building and starting the local full-stack Docker environment"
invoke_compose up --build -d

write_step "Waiting for backend and unified gateway health checks"
wait_for_url "http://localhost:${BACKEND_HOST_PORT}/health"
wait_for_url "http://localhost:${GATEWAY_HOST_PORT}/api/v1/health"

sync_database_schema

if [[ "$SKIP_SEED" != "true" ]]; then
  SHOULD_SEED="$FORCE_SEED"

  if [[ "$SHOULD_SEED" != "true" ]]; then
    USER_COUNT="$(get_user_count)"
    if [[ "$USER_COUNT" == "0" ]]; then
      SHOULD_SEED=true
    else
      echo "Seed skipped: detected ${USER_COUNT} existing users."
    fi
  fi

  if [[ "$SHOULD_SEED" == "true" ]]; then
    if backend_has_script "db:seed"; then
      write_step "Seeding demo accounts and subjects"
      invoke_backend_command pnpm run db:seed
    else
      echo "Seed skipped: backend/package.json does not define db:seed."
    fi
  fi
fi

if [[ "$RUN_SMOKE_TEST" == "true" ]]; then
  if [[ -f "$PROJECT_ROOT/backend/scripts/api-mock-smoke.js" ]]; then
    write_step "Running backend smoke test"
    invoke_backend_command node scripts/api-mock-smoke.js
  else
    echo "Smoke test skipped: backend/scripts/api-mock-smoke.js not found."
  fi
fi

echo
echo "Local environment is ready."
echo "Frontend: http://localhost:${GATEWAY_HOST_PORT}"
echo "Backend:  http://localhost:${GATEWAY_HOST_PORT}/api/v1/health"
