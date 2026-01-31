#!/bin/bash

echo "=== REPOSITORY AFTER & EVALUATION COMMANDS ==="
echo ""

echo "📁 REPOSITORY AFTER:"
echo "Basic: docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./..."
echo "Volume: docker run --rm -v \$(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./..."
echo "Aquila: docker run --rm -v \$CODEBUILD_SRC_DIR:/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./..."
echo ""

echo "🐍 EVALUATION:"
echo "Basic: docker run --rm hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation"
echo "Volume: docker run --rm -v \$(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation"
echo "Aquila: docker run --rm -v \$CODEBUILD_SRC_DIR:/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation"
echo ""

echo "🔄 COMBINED:"
echo "Sequential: Run repo tests THEN evaluation"
echo "Single: docker run --rm -v \$(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c 'cd /app/repository_after && go test -v ./... && cd /app && python3 -m evaluation.evaluation'"
echo ""

echo "📊 REPORTS:"
echo "Repo JSON: docker run --rm -v \$(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v -json ./... > repo_after.json"
echo "Eval Report: docker run --rm -v \$(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation"
echo ""

echo "✅ KEY POINTS:"
echo "- Repository After: Use -w /app/repository_after with go test"
echo "- Evaluation: Use python3 -m evaluation.evaluation from /app"
echo "- Always use volume mount for host access"
echo "- Aquila: Use \$CODEBUILD_SRC_DIR for path"
