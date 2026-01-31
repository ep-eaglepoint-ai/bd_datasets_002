#!/bin/sh
set -eu

OUT_FILE=$(mktemp)
echo "Running tests..."
# Allow skipping the race detector when running in environments without cgo support.
RACE_FLAG="-race"
if [ "${NO_RACE:-}" = "1" ]; then
  RACE_FLAG=""
fi

# Run tests (optionally skipping -race) with verbose output. Capture output even if tests fail.
go test $RACE_FLAG -v ./after/... >"$OUT_FILE" 2>&1 || true

cat "$OUT_FILE"

PASS_COUNT=$(grep -E '^--- PASS: ' "$OUT_FILE" | wc -l | tr -d ' ')
FAIL_COUNT=$(grep -E '^--- FAIL: ' "$OUT_FILE" | wc -l | tr -d ' ')

echo
echo "Test results summary:"
if [ "$PASS_COUNT" -gt 0 ]; then
  echo "Passed tests:"
  grep -E '^--- PASS: ' "$OUT_FILE" | sed -E 's/^--- PASS: ([^ ]+).*/  \1/' || true
fi
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "Failed tests:"
  grep -E '^--- FAIL: ' "$OUT_FILE" | sed -E 's/^--- FAIL: ([^ ]+).*/  \1/' || true
fi
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"

if [ "$FAIL_COUNT" -ne 0 ]; then
  exit 1
fi

exit 0
