#!/bin/bash
# Test to verify that exit code 1 from test-before doesn't stop the build

set -e

echo "=========================================="
echo "Testing Exit Code Handling"
echo "=========================================="

# Simulate the exact buildspec.yml logic
BUILD_CMD_BEFORE="echo 'Some tests failed: 11 passed, 4 failed out of 15 total' && exit 1"

echo ""
echo "Simulating test-before command that exits with code 1..."
echo "Running repository_before build command (failures expected on fix branches)..."

# Disable exit on error for this command block, run the test, then re-enable
set +e
/bin/bash -c "set -o pipefail; $BUILD_CMD_BEFORE 2>&1 | tee /tmp/docker_before.log"
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -ne 0 ]; then
  echo "Pre-build tests had expected failures (exit code: $EXIT_CODE) — continuing"
fi

echo ""
echo "✅ PASS: Script continued after exit code $EXIT_CODE"
echo "✅ PASS: Build would continue to next step"

# Verify we can still run subsequent commands
echo ""
echo "Simulating subsequent build step (test-after)..."
echo "This should run successfully after test-before failure"
echo "✅ PASS: Subsequent commands can execute"

echo ""
echo "=========================================="
echo "Exit code handling test passed! ✅"
echo "=========================================="
