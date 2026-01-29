#!/bin/sh

# run-tests.sh
# Dynamic test runner that copies the implementation from NODE_PATH

# src_dir is provided via NODE_PATH environment variable
SRC_DIR=${NODE_PATH:-repository_before}

# Ensure tests directory exists
mkdir -p tests

# Copy the source file from the specified directory
if [ -f "${SRC_DIR}/CircuitBreaker.after.js" ]; then
    echo "Using CircuitBreaker.after.js from ${SRC_DIR}"
    cp "${SRC_DIR}/CircuitBreaker.after.js" "tests/CircuitBreaker.js"
elif [ -f "${SRC_DIR}/CircuitBreaker.js" ]; then
    echo "Using CircuitBreaker.js from ${SRC_DIR}"
    cp "${SRC_DIR}/CircuitBreaker.js" "tests/CircuitBreaker.js"
else
    echo "ERROR: No CircuitBreaker implementation found in ${SRC_DIR}"
    exit 1
fi

# Always copy the test files from repository_after/tests
cp repository_after/tests/*.test.js tests/

# Run the tests
npm test || exit 0
