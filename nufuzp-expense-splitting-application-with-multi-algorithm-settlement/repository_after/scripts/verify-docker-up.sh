#!/usr/bin/env bash
# Requirement 10: Verify that a single "docker compose up" brings up a healthy,
# reachable app with migrations run. Run from repository_after: ./scripts/verify-docker-up.sh
# Requires: Docker, docker compose. Optional: set AUTH_SECRET, RESEND_API_KEY for full auth.

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Building and starting services..."
docker compose up -d --build

cleanup() {
  echo "Shutting down..."
  docker compose down
}
trap cleanup EXIT

echo "Waiting for app at http://localhost:3000 (max 90s)..."
MAX_ATTEMPTS=30
INTERVAL=3
for i in $(seq 1 $MAX_ATTEMPTS); do
  if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:3000 | grep -qE '^[23]'; then
    echo "App is reachable (attempt $i)."
    exit 0
  fi
  [ $i -lt $MAX_ATTEMPTS ] && sleep $INTERVAL
done

echo "App did not become reachable in time."
exit 1
