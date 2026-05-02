#!/usr/bin/env bash

set -euo pipefail

SKIP_SEED=false
RUN_SMOKE_TEST=false
PROJECT_NAME="tutorconnect"
ENV_FILE=".env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-seed)
      echo "--force-seed is now the default; seeding runs unless --skip-seed is provided."
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

  grep -Eq "\"${script_name}\"[[:space:]]*:" "$PROJECT_ROOT/backend/package.json"
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-180}"
  local elapsed=0

  while [[ "$elapsed" -lt "$timeout_seconds" ]]; do
    local status_code
    status_code="$(curl -k -s -o /dev/null -w "%{http_code}" "$url" || true)"
    if [[ "$status_code" =~ ^[234][0-9][0-9]$ ]]; then
      return
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "Timed out waiting for $url" >&2
  exit 1
}

sync_database_schema() {
  write_step "Synchronizing Prisma schema with the database"
  invoke_backend_command pnpm exec prisma db push --accept-data-loss
}

ensure_https_certificate() {
  local cert_host="${1:-localhost}"
  local cert_dir="$PROJECT_ROOT/nginx/certs"
  local cert_file="$cert_dir/localhost.crt"
  local key_file="$cert_dir/localhost.key"

  if [[ -f "$cert_file" && -f "$key_file" ]]; then
    return
  fi

  write_step "Generating a local self-signed HTTPS certificate"
  mkdir -p "$cert_dir"

  local openssl_config
  openssl_config="$(mktemp)"
  cat >"$openssl_config" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3_req
prompt = no

[dn]
CN = localhost

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = ${cert_host}
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -sha256 \
    -days 3650 \
    -keyout "$key_file" \
    -out "$cert_file" \
    -subj "/CN=localhost" \
    -config "$openssl_config" >/dev/null 2>&1

  rm -f "$openssl_config"
}

ensure_command docker "Install Docker Desktop and make sure the daemon is running."
ensure_command curl "Install curl so the startup script can wait for local health checks."
ensure_command openssl "Install OpenSSL so the startup script can create a local HTTPS certificate."
ENV_FILE_PATH="$(ensure_root_env "$ENV_FILE")"
BACKEND_HOST_PORT="$(get_env_value "$ENV_FILE_PATH" "BACKEND_HOST_PORT" "5050")"
GATEWAY_HOST_PORT="$(get_env_value "$ENV_FILE_PATH" "NGINX_HOST_PORT" "8443")"
MAILBOX_HOST_PORT="$(get_env_value "$ENV_FILE_PATH" "MAILPIT_UI_HOST_PORT" "8025")"
HTTPS_CERT_HOST="$(get_env_value "$ENV_FILE_PATH" "HTTPS_CERT_HOST" "localhost")"
GATEWAY_URL="$(get_env_value "$ENV_FILE_PATH" "FRONTEND_URL" "https://localhost:${GATEWAY_HOST_PORT}")"
GATEWAY_URL="${GATEWAY_URL%/}"

ensure_https_certificate "$HTTPS_CERT_HOST"

write_step "Building and starting the local full-stack Docker environment"
invoke_compose up --build -d

write_step "Waiting for backend and unified gateway health checks"
wait_for_url "http://localhost:${BACKEND_HOST_PORT}/health"
wait_for_url "${GATEWAY_URL}/api/v1/health"

sync_database_schema

if [[ "$SKIP_SEED" != "true" ]]; then
  if backend_has_script "db:seed"; then
    write_step "Seeding demo accounts and subjects"
    invoke_backend_command pnpm run db:seed
  else
    echo "Seed skipped: backend/package.json does not define db:seed."
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
echo "Frontend: ${GATEWAY_URL}"
echo "Backend:  ${GATEWAY_URL}/api/v1/health"
echo "Mailbox:  http://localhost:${MAILBOX_HOST_PORT}"
