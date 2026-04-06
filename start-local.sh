#!/usr/bin/env bash

set -euo pipefail

force_seed=0
skip_seed=0
run_smoke_test=0
project_name="tutorconnect"
env_file=".env"

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_root"

write_step() {
	printf '==> %s\n' "$1"
}

fail() {
	printf '%s\n' "$1" >&2
	exit 1
}

usage() {
	cat <<'EOF'
Usage: ./start-local.sh [options]

Options:
	--force-seed            Always seed demo data after startup.
	--skip-seed             Skip seeding demo data.
	--run-smoke-test        Run the backend smoke test after startup.
	--project-name NAME     Docker Compose project name. Default: tutorconnect.
	--env-file PATH         Env file to use. Default: .env.
	-h, --help              Show this help text.
EOF
}

ensure_command() {
	local name="$1"
	local hint="$2"

	if ! command -v "$name" >/dev/null 2>&1; then
		fail "$name not found. $hint"
	fi
}

ensure_root_env() {
	local env_file_name="$1"
	local env_path="$project_root/$env_file_name"
	local env_example="$project_root/.env.example"

	if [[ ! -f "$env_path" ]]; then
		if [[ ! -f "$env_example" ]]; then
			fail 'Missing .env and .env.example.'
		fi

		cp "$env_example" "$env_path"
		printf 'Created %s from .env.example\n' "$env_file_name"
	fi

	printf '%s\n' "$env_path"
}

trim_whitespace() {
	local value="$1"

	value="${value#"${value%%[![:space:]]*}"}"
	value="${value%"${value##*[![:space:]]}"}"
	printf '%s' "$value"
}

strip_matching_quotes() {
	local value="$1"
	local first_char
	local last_char

	if [[ ${#value} -lt 2 ]]; then
		printf '%s' "$value"
		return
	fi

	first_char="${value:0:1}"
	last_char="${value:${#value}-1:1}"

	if [[ "$first_char" == '"' && "$last_char" == '"' ]]; then
		value="${value:1:${#value}-2}"
	elif [[ "$first_char" == "'" && "$last_char" == "'" ]]; then
		value="${value:1:${#value}-2}"
	fi

	printf '%s' "$value"
}

get_env_value() {
	local env_path="$1"
	local name="$2"
	local default_value="$3"
	local line
	local value

	if [[ ! -f "$env_path" ]]; then
		printf '%s\n' "$default_value"
		return
	fi

	line="$(grep -E "^[[:space:]]*${name}[[:space:]]*=" "$env_path" | head -n 1 || true)"
	if [[ -z "$line" ]]; then
		printf '%s\n' "$default_value"
		return
	fi

	line="${line%$'\r'}"
	value="${line#*=}"
	value="$(trim_whitespace "$value")"
	value="$(strip_matching_quotes "$value")"
	printf '%s\n' "$value"
}

invoke_compose() {
	docker compose --env-file "$env_file" -p "$project_name" "$@"
}

invoke_backend_command() {
	docker compose --env-file "$env_file" -p "$project_name" exec -T backend "$@"
}

wait_for_url() {
	local url="$1"
	local timeout_seconds="${2:-180}"
	local elapsed=0
	local status_code

	while (( elapsed < timeout_seconds )); do
		status_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)"
		if [[ "$status_code" =~ ^[234][0-9][0-9]$ ]]; then
			return
		fi

		sleep 2
		elapsed=$((elapsed + 2))
	done

	fail "Timed out waiting for $url"
}

get_user_count() {
	local script
	local output

	script='const { PrismaClient } = require("@prisma/client"); const prisma = new PrismaClient(); prisma.user.count().then((count) => { console.log(count); }).catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });'
	output="$(docker compose --env-file "$env_file" -p "$project_name" exec -T backend node -e "$script")" || fail 'Failed to inspect database state.'
	printf '%s\n' "$output" | tail -n 1 | tr -d '\r'
}

sync_database_schema() {
	write_step 'Synchronizing Prisma schema with the database'
	invoke_backend_command pnpm exec prisma db push --accept-data-loss
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--force-seed)
			force_seed=1
			;;
		--skip-seed)
			skip_seed=1
			;;
		--run-smoke-test)
			run_smoke_test=1
			;;
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

ensure_command docker 'Install Docker Desktop and make sure the daemon is running.'
ensure_command curl 'curl is required to check service health endpoints.'

env_file_path="$(ensure_root_env "$env_file")"
backend_host_port="$(get_env_value "$env_file_path" 'BACKEND_HOST_PORT' '5050')"
gateway_host_port="$(get_env_value "$env_file_path" 'NGINX_HOST_PORT' '8080')"

write_step 'Building and starting the local full-stack Docker environment'
invoke_compose up --build -d

write_step 'Waiting for backend and unified gateway health checks'
wait_for_url "http://localhost:${backend_host_port}/health"
wait_for_url "http://localhost:${gateway_host_port}/api/v1/health"

sync_database_schema

if (( skip_seed == 0 )); then
	should_seed=$force_seed

	if (( should_seed == 0 )); then
		user_count="$(get_user_count)"
		if [[ "$user_count" == '0' ]]; then
			should_seed=1
		else
			printf 'Seed skipped: detected %s existing users.\n' "$user_count"
		fi
	fi

	if (( should_seed == 1 )); then
		write_step 'Seeding demo accounts and subjects'
		invoke_backend_command pnpm run db:seed
	fi
fi

if (( run_smoke_test == 1 )); then
	write_step 'Running backend smoke test'
	invoke_backend_command node scripts/api-mock-smoke.js
fi

printf '\nLocal environment is ready.\n'
printf 'Frontend: http://localhost:%s\n' "$gateway_host_port"
printf 'Backend:  http://localhost:%s/api/v1/health\n' "$gateway_host_port"
