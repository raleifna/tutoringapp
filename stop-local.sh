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
cd "$PROJECT_ROOT"

docker compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" down

echo "Local Docker environment stopped."
