#!/bin/sh

# Final test runner script with proper xfail handling

TEST_TYPE=$1

echo "=== Running Repository $TEST_TYPE Tests ==="

cd /app
go work sync
cd tests

if [ "$TEST_TYPE" = "before" ]; then
    echo "Testing repository_before (expected to FAIL requirements but return 0)"
    
    # Run before tests and capture output
    go test -v final_test.go -run TestBeforeFinal 2>&1
    TEST_EXIT_CODE=$?
    
    # Check if tests failed as expected (exit code 1 means tests failed)
    if [ $TEST_EXIT_CODE -eq 1 ]; then
        echo "SUCCESS: Before tests FAILED as expected (repository_before doesn't meet requirements)"
        # Create marker file to indicate expected failure was properly demonstrated
        touch /tmp/BUILD_FAILED_BEFORE_EXPECTED
        exit 0  # Return 0 for CI auditor (xfail behavior)
    else
        echo "UNEXPECTED: Before tests passed when they should have failed"
        exit 1
    fi

elif [ "$TEST_TYPE" = "after" ]; then
    echo "Testing repository_after (expected to PASS all requirements)"
    
    # Run after tests - these should pass
    if go test -v final_test.go -run TestAfterFinal; then
        echo "SUCCESS: After tests passed - all requirements verified"
        exit 0
    else
        echo "FAILURE: After tests failed unexpectedly"
        touch /tmp/BUILD_FAILED_AFTER_UNEXPECTED
        exit 1
    fi
else
    echo "Usage: $0 [before|after]"
    exit 1
fi
