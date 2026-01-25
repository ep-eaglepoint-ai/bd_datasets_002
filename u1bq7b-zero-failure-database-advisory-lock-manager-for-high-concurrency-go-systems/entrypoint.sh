#!/bin/sh
set -e

# Default to 'after' if not legacy environment variable set
target="${TEST_TARGET:-after}"

echo "Entrypoint: Setting up environment for target: $target"

# Patch repository_before to fix Go version issue (1.25.5 -> 1.21)
# We do this every time to ensure it's available for evaluation.go as well
if [ ! -d "/tmp/repository_before/dblock-demo" ]; then
    echo "Entrypoint: Patching repository_before to /tmp/repository_before..."
    mkdir -p /tmp/repository_before
    cp -r ./repository_before/* /tmp/repository_before/
    
    if [ -f "/tmp/repository_before/dblock-demo/go.mod" ]; then
        sed -i 's/go 1.25.5/go 1.21/' /tmp/repository_before/dblock-demo/go.mod
    fi
fi

# Switch go.mod replacement based on target
if [ "$target" = "before" ]; then
    echo "Entrypoint: Switching go.mod to repository_before (patched)..."
    go mod edit -replace dblock-demo=/tmp/repository_before/dblock-demo
else
    echo "Entrypoint: Switching go.mod to repository_after..."
    go mod edit -replace dblock-demo=./repository_after
fi

# Exec the command
exec "$@"
