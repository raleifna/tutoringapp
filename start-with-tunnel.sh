#!/usr/bin/env bash

set -euo pipefail

FORCE_SEED=false
SKIP_SEED=false
RUN_SMOKE_TEST=false
TUNNEL_TIMEOUT_SECONDS=90
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
    --tunnel-timeout-seconds)
      TUNNEL_TIMEOUT_SECONDS="${2:?Missing value for --tunnel-timeout-seconds}"
      shift 2
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
RUNTIME_DIR="$PROJECT_ROOT/.runtime/$PROJECT_NAME"
PID_FILE="$RUNTIME_DIR/cloudflared.pid"
LOG_FILE="$RUNTIME_DIR/cloudflared.log"
URL_FILE="$RUNTIME_DIR/cloudflared-url.txt"

cd "$PROJECT_ROOT"

write_step() {
  echo "==> $1"
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

stop_existing_tunnel() {
  if [[ ! -f "$PID_FILE" ]]; then
    return
  fi

  local existing_pid
  existing_pid="$(head -n 1 "$PID_FILE" | tr -d '[:space:]')"
  if [[ "$existing_pid" =~ ^[0-9]+$ ]] && kill -0 "$existing_pid" >/dev/null 2>&1; then
    kill "$existing_pid" >/dev/null 2>&1 || true
    sleep 1
    kill -9 "$existing_pid" >/dev/null 2>&1 || true
  fi

  rm -f "$PID_FILE"
}

wait_for_tunnel_url() {
  local timeout_seconds="$1"
  local elapsed=0

  while [[ "$elapsed" -lt "$timeout_seconds" ]]; do
    if [[ -f "$LOG_FILE" ]]; then
      local url
      url="$(grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' "$LOG_FILE" | head -n 1 || true)"
      if [[ -n "$url" ]]; then
        printf '%s\n' "$url"
        return
      fi
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "Timed out waiting for Cloudflare Tunnel URL. Check $LOG_FILE" >&2
  exit 1
}

wait_for_public_health() {
  local url="$1"
  local timeout_seconds="${2:-90}"
  local health_url="${url}/api/v1/health"
  local host_name
  host_name="$(printf '%s\n' "$url" | sed -E 's#https?://([^/]+).*#\1#')"
  local elapsed=0

  while [[ "$elapsed" -lt "$timeout_seconds" ]]; do
    if curl -fsS -H "Origin: $url" "$health_url" >/dev/null 2>&1; then
      return
    fi

    local fallback_ip
    fallback_ip="$(dig +short "$host_name" @1.1.1.1 | head -n 1 || true)"
    if [[ -n "$fallback_ip" ]]; then
      if curl -fsS --resolve "${host_name}:443:${fallback_ip}" -H "Origin: $url" "$health_url" >/dev/null 2>&1; then
        return
      fi
    fi

    sleep 5
    elapsed=$((elapsed + 5))
  done

  echo "Timed out waiting for public health endpoint: $health_url" >&2
  exit 1
}

test_default_dns_resolution() {
  local url="$1"
  local host_name
  host_name="$(printf '%s\n' "$url" | sed -E 's#https?://([^/]+).*#\1#')"

  [[ -n "$(dig +short "$host_name" | head -n 1 || true)" ]]
}

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install it first, for example with: brew install cloudflared" >&2
  exit 1
fi

ENV_FILE_PATH="$(ensure_root_env "$ENV_FILE")"
GATEWAY_HOST_PORT="$(get_env_value "$ENV_FILE_PATH" "NGINX_HOST_PORT" "8080")"

mkdir -p "$RUNTIME_DIR"
stop_existing_tunnel
rm -f "$LOG_FILE" "$URL_FILE"

LOCAL_ARGS=()
if [[ "$FORCE_SEED" == "true" ]]; then
  LOCAL_ARGS+=(--force-seed)
fi
if [[ "$SKIP_SEED" == "true" ]]; then
  LOCAL_ARGS+=(--skip-seed)
fi
if [[ "$RUN_SMOKE_TEST" == "true" ]]; then
  LOCAL_ARGS+=(--run-smoke-test)
fi
LOCAL_ARGS+=(--project-name "$PROJECT_NAME" --env-file "$ENV_FILE")

write_step "Starting local Docker stack before exposing it externally"
ALLOW_TRYCLOUDFLARE_CORS=true "$PROJECT_ROOT/start-local.sh" "${LOCAL_ARGS[@]}"

write_step "Launching Cloudflare Tunnel in the background"
nohup cloudflared tunnel --url "http://localhost:${GATEWAY_HOST_PORT}" --no-autoupdate >"$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

PUBLIC_URL="$(wait_for_tunnel_url "$TUNNEL_TIMEOUT_SECONDS")"
printf '%s\n' "$PUBLIC_URL" > "$URL_FILE"

write_step "Verifying the public tunnel health endpoint and CORS"
wait_for_public_health "$PUBLIC_URL" 90

echo
echo "Remote tunnel is ready."
echo "Public URL: $PUBLIC_URL"

if ! test_default_dns_resolution "$PUBLIC_URL"; then
  echo
  echo "Local/default DNS cannot resolve the tunnel host yet."
  echo "Open it manually with: open \"$PUBLIC_URL\""
fi
