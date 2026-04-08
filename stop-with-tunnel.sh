#!/usr/bin/env bash

set -euo pipefail

PROJECT_NAME="tutorconnect"
ENV_FILE=".env"

while [[ $# -gt 0 ]]; do
  case "$1" in
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

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(head -n 1 "$PID_FILE" | tr -d '[:space:]')"
  if [[ "$EXISTING_PID" =~ ^[0-9]+$ ]] && kill -0 "$EXISTING_PID" >/dev/null 2>&1; then
    kill "$EXISTING_PID" >/dev/null 2>&1 || true
    sleep 1
    kill -9 "$EXISTING_PID" >/dev/null 2>&1 || true
  fi
fi

rm -f "$PID_FILE" "$LOG_FILE" "$URL_FILE"

"$PROJECT_ROOT/stop-local.sh" --project-name "$PROJECT_NAME" --env-file "$ENV_FILE"
