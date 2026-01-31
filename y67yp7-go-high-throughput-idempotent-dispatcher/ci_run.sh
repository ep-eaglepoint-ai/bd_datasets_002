#!/bin/bash
set -e

echo "=== [1/3] Building Docker Image ==="
docker build -t hailu3548/jr2pzv-app .

echo "=== [2/3] Running Go Tests (repository_after) ==="
docker run --rm hailu3548/jr2pzv-app sh -c "cd repository_after && go test -v -race ./..."

echo "=== [3/3] Running Evaluation ==="
# Determine evaluation path (handle local vs CodeBuild)
EVAL_PATH=$(pwd)/evaluation
if [ ! -z "$CODEBUILD_SRC_DIR" ]; then
    EVAL_PATH="$CODEBUILD_SRC_DIR/y67yp7-go-high-throughput-idempotent-dispatcher/evaluation"
fi

docker run --rm -v "$EVAL_PATH:/app/evaluation" hailu3548/jr2pzv-app python evaluation/evaluation.py

echo "=== Build Successful ==="
