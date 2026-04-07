#!/usr/bin/env bash

set -euo pipefail

project_name="tutorconnect"
env_file=".env"

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_root"

usage() {
	cat <<'EOF'
Usage: ./stop-local.sh [options]

Options:
	--project-name NAME     Docker Compose project name. Default: tutorconnect.
	--env-file PATH         Env file to use. Default: .env.
	-h, --help              Show this help text.
EOF
}

fail() {
	printf '%s\n' "$1" >&2
	exit 1
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--project-name)
			shift
			[[ $# -gt 0 ]] || fail '--project-name requires a value.'
			project_name="$1"
			;;
		--env-file)
			shift
			[[ $# -gt 0 ]] || fail '--env-file requires a value.'
			env_file="$1"
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			usage >&2
			fail "Unknown argument: $1"
			;;
	esac
	shift
done

docker compose --env-file "$env_file" -p "$project_name" down

printf 'Local Docker environment stopped.\n'
