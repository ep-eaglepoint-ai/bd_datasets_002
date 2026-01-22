#!/bin/bash
set -e

# Clean up any previous markers
rm -f /tmp/BUILD_FAILED_* /tmp/EVALUATION_* 2>/dev/null || true

# Run evaluation
python evaluation/evaluation.py "$@"

# Check evaluation result (not individual test phase results)
if [ -f /tmp/EVALUATION_SUCCESS ]; then
    echo "✅ Evaluation succeeded"
    exit 0
elif [ -f /tmp/EVALUATION_FAILED ]; then
    echo "❌ Evaluation failed"
    exit 1
else
    echo "⚠️  Evaluation status unknown"
    exit 1
fi
