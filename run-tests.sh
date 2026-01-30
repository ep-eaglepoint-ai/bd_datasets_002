#!/bin/bash

echo "========================================="
echo "Running Tests in Docker"
echo "========================================="

echo ""
echo "1. Verify Before State"
echo "---------------------------------------"
docker compose run --rm test sh -c "PYTHONPATH=/app/repository_before pytest repository_after/tests -q"
BEFORE_EXIT=$?

echo ""
echo "2. Verify After State"
echo "---------------------------------------"
docker compose run --rm test sh -c "PYTHONPATH=/app/repository_after pytest repository_after/tests -q"
AFTER_EXIT=$?

echo ""
echo "3. Run Evaluation"
echo "---------------------------------------"
docker compose run --rm test python evaluation/evaluation.py
EVAL_EXIT=$?

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo "Before State: $([ $BEFORE_EXIT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "After State:  $([ $AFTER_EXIT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "Evaluation:   $([ $EVAL_EXIT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "========================================="
