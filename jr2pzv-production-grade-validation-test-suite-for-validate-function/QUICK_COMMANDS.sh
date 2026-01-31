#!/bin/bash

# Docker Commands for Aquila Platform - Quick Reference

echo "=== DOCKER COMMANDS FOR AQUILA PLATFORM ==="
echo ""

# 1. Pull latest image
echo "1. Pull latest image:"
echo "docker pull hailu3548/jr2pzv-app:robust-report"
echo ""

# 2. Complete evaluation
echo "2. Complete evaluation:"
echo "docker run --rm -v /path/to/repository:/app hailu3548/jr2pzv-app:robust-report"
echo ""

# 3. Repository tests
echo "3. Repository tests:"
echo "docker run --rm -w /app/repository_before hailu3548/jr2pzv-app:robust-report go test -v ./..."
echo "docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./..."
echo ""

# 4. Evaluation only
echo "4. Evaluation only:"
echo "docker run --rm hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation"
echo ""

# 5. Test locally
echo "5. Test locally:"
echo "docker run --rm -v \$(pwd):/app hailu3548/jr2pzv-app:robust-report"
echo ""

# 6. Verify report
echo "6. Verify report:"
echo "ls -la evaluation/report.json"
echo "head -5 evaluation/report.json"
echo ""

echo "=== PLATFORM INTEGRATION ==="
echo "Image: hailu3548/jr2pzv-app:robust-report"
echo "Volume: /path/to/repo:/app"
echo "Artifact: evaluation/report.json"
echo ""

echo "=== TROUBLESHOOTING ==="
echo "Check image: docker images hailu3548/jr2pzv-app"
echo "Inspect: docker inspect hailu3548/jr2pzv-app:robust-report"
echo "Manual report: docker run --rm hailu3548/jr2pzv-app:robust-report /app/ensure-report.sh"
