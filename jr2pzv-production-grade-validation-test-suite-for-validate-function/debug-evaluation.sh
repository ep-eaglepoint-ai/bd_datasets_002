#!/bin/bash

echo "=== DEBUGGING EVALUATION ==="
echo "Current directory: $(pwd)"
echo "Docker image: hailu3548/jr2pzv-app"
echo "Command: docker run --rm hailu3548/jr2pzv-app"
echo ""

echo "=== RUNNING DOCKER CONTAINER ==="
docker run --rm hailu3548/jr2pzv-app

echo ""
echo "=== CHECKING HOST FILESYSTEM AFTER ==="
if [ -d "evaluation" ]; then
    echo "evaluation directory exists"
    ls -la evaluation/
    if [ -f "evaluation/report.json" ]; then
        echo "✅ report.json found in evaluation/"
        echo "File size: $(wc -c < evaluation/report.json) bytes"
        echo "First 3 lines:"
        head -3 evaluation/report.json
    else
        echo "❌ report.json NOT found in evaluation/"
    fi
else
    echo "❌ evaluation directory does not exist"
fi

echo ""
echo "=== TESTING WITH VOLUME MOUNT ==="
docker run --rm -v "$(pwd):/app" hailu3548/jr2pzv-app bash -c "cd /app && python3 -m evaluation.evaluation"

echo ""
echo "=== CHECKING HOST FILESYSTEM AFTER VOLUME MOUNT ==="
if [ -f "evaluation/report.json" ]; then
    echo "✅ report.json found after volume mount"
    echo "File size: $(wc -c < evaluation/report.json) bytes"
else
    echo "❌ report.json still NOT found"
fi
