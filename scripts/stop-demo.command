#!/bin/bash
set -uo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
backend="$(lsof -ti tcp:8080 -sTCP:LISTEN || true)"

if [ -n "$backend" ]; then
  kill $backend
  echo "Backend stopped"
else
  echo "Backend was not running"
fi

if [ "${1:-}" = "--all" ]; then
  pg_ctl -D /opt/homebrew/var/postgresql@18 stop -m fast > /dev/null && echo "PostgreSQL stopped"
fi
