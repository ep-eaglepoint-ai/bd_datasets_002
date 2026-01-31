#!/bin/bash

echo "=== Running Frontend Tests ==="

# Run tests from frontend directory using the symlinked test file
# The test file is symlinked from /app/tests to /app/repository_after/frontend/src/__tests__
cd /app/repository_after/frontend
npx vitest run

exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo "✓ Frontend tests passed"
else
  echo "✗ Frontend tests failed"
fi

exit $exit_code
