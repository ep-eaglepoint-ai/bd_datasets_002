#!/bin/bash

echo "Testing Docker image report generation..."
echo "========================================"

# Run the container and capture output
docker run --rm hailu3548/jr2pzv-app > test-output.log 2>&1

# Check if report was mentioned in logs
if grep -q "Report written to:" test-output.log; then
    echo "✅ Report generation confirmed in logs"
else
    echo "❌ Report generation not found in logs"
    exit 1
fi

# Check if tests passed
if grep -q "Overall Status: PASS" test-output.log; then
    echo "✅ Tests passed successfully"
else
    echo "❌ Tests did not pass"
    exit 1
fi

# Check if report file locations are mentioned
if grep -q "/app/evaluation/report.json" test-output.log; then
    echo "✅ Report file location confirmed"
else
    echo "❌ Report file location not found"
    exit 1
fi

echo "========================================"
echo "✅ All checks passed! Report generation working correctly."
echo "========================================"

# Show summary
echo "Summary from logs:"
grep -E "(Repository Before|Repository After|Overall Status)" test-output.log
