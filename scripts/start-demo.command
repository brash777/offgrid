#!/bin/bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
root="$(cd "$(dirname "$0")/.." && pwd)"
logs="$HOME/Library/Logs/OFFGRID"
data="/opt/homebrew/var/postgresql@18"
health="http://localhost:8080/api-docs"
app="$root/desktop/release/mac-arm64/OFFGRID.app"
mkdir -p "$logs"

if pg_isready -q; then
  echo "PostgreSQL is already running"
else
  echo "Starting PostgreSQL"
  pg_ctl -D "$data" -l "$logs/postgresql.log" -w start > /dev/null
fi

if curl -fs -o /dev/null "$health"; then
  echo "Backend is already running"
else
  echo "Starting backend (about 20 s)"
  cd "$root/backend"
  SPRING_PROFILES_ACTIVE=dev \
    DB_URL="jdbc:postgresql://localhost:5432/flowstore" \
    DB_USERNAME="$USER" \
    DB_PASSWORD="" \
    nohup ./mvnw -q spring-boot:run > "$logs/backend.log" 2>&1 &
  for _ in $(seq 1 120); do
    curl -fs -o /dev/null "$health" && break
    sleep 1
  done
fi

if ! curl -fs -o /dev/null "$health"; then
  echo "The backend did not start. Log: $logs/backend.log"
  exit 1
fi

echo "Backend ready: http://localhost:8080  (Swagger: http://localhost:8080/docs)"
if [ -d "$app" ]; then
  open "$app"
else
  echo "Packaged app not found. Build it with: cd desktop && npm run package:dir"
fi
