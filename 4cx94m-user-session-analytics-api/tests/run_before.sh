#!/bin/sh
set -eu
echo "Running verbose static checks against repository_before..."
echo
echo "Tests to run:"
echo "- NoMutableCachedSessions"
echo "- NoNestedLoops"
echo "- DurationPatternPresent"
echo
repo=repository_before/SessionAnalyticsController.java
if [ ! -f "$repo" ]; then
	echo "FAIL: $repo not found" >&2
	exit 1
fi

total=0
passed=0
failed_count=0
failed_list=""

run_test() {
	name="$1"; shift
	cmd="$*"
	total=$((total + 1))
	if sh -c "$cmd" >/dev/null 2>&1; then
		echo "[PASS] $name"
		passed=$((passed + 1))
	else
		echo "[FAIL] $name"
		failed_count=$((failed_count + 1))
		failed_list="${failed_list}${failed_list:+ }${name}"
	fi
}

# 1) No mutable cachedSessions field
echo "- sessionHasBeanValidationAnnotations"
echo "- apiExceptionHandlerReturnsStableStructure"
echo "- controllerHasCorrectRequestMappingAndMethod"
echo "- repositoryContainsNoMutableCacheOrNestedLoops"
echo "- controllerIsStatelessAndValidatorIsStaticFinal"
echo "- durationCalculatedAsEndMinusStart"
echo "- rejectsSessionsWhereEndBeforeStart"
echo "- controllerIsStateless"

# helper to search the repository_before dir
repo_dir=repository_before

# 1) sessionHasBeanValidationAnnotations
run_test "sessionHasBeanValidationAnnotations" "( grep -R -q 'class Session' $repo_dir || true ) && grep -R -q 'startTime' $repo_dir && grep -R -q 'endTime' $repo_dir && grep -R -q '@NotNull' $repo_dir && grep -R -q '@AssertTrue' $repo_dir"

# 2) apiExceptionHandlerReturnsStableStructure
run_test "apiExceptionHandlerReturnsStableStructure" "( grep -R -q 'class ApiExceptionHandler' $repo_dir || grep -R -q '@ControllerAdvice' $repo_dir || grep -R -q 'handleConstraintViolation' $repo_dir )"

# 3) controllerHasCorrectRequestMappingAndMethod
run_test "controllerHasCorrectRequestMappingAndMethod" "( grep -R -q '/api/sessions' $repo_dir && grep -R -q '@PostMapping' $repo_dir && grep -R -q '/analyze' $repo_dir && grep -R -q 'count' $repo_dir && grep -R -q 'averageDuration' $repo_dir && grep -R -q 'longestSession' $repo_dir )"

# 4) repositoryContainsNoMutableCacheOrNestedLoops
run_test "repositoryContainsNoMutableCacheOrNestedLoops" "( ! grep -R -q 'cachedSessions' $repo_dir && !( grep -R -q 'for (int i = 0; i < sessions.size(); i++)' $repo_dir && grep -R -q 'for (int j = 0; j < sessions.size(); j++)' $repo_dir ) )"

# 5) controllerIsStatelessAndValidatorIsStaticFinal
run_test "controllerIsStatelessAndValidatorIsStaticFinal" "( grep -R -q 'class SessionAnalyticsController' $repo_dir && grep -R -q 'static final .*validator' $repo_dir )"

# 6) durationCalculatedAsEndMinusStart
run_test "durationCalculatedAsEndMinusStart" "( grep -R -q 'getEndTime() - s.getStartTime()' $repo_dir || grep -R -q 'getEndTime() - getStartTime' $repo_dir )"

# 7) rejectsSessionsWhereEndBeforeStart
run_test "rejectsSessionsWhereEndBeforeStart" "( grep -R -q '@AssertTrue' $repo_dir || grep -R -q 'ConstraintViolationException' $repo_dir || grep -R -q 'isEndAfterOrEqualStart' $repo_dir )"

# 8) controllerIsStateless
run_test "controllerIsStateless" "( ! grep -R -q 'List<Session> cachedSessions' $repo_dir && ! grep -R -q 'private .*validator' $repo_dir )"

echo
if [ "$failed_count" -gt 0 ]; then
	echo "Test summary: some tests failed"
	echo "Total: $total, Passed: $passed, Failed: $failed_count"
	echo "Failed tests: $failed_list" >&2
	exit 1
else
	echo "Test summary: all tests passed"
	echo "Total: $total, Passed: $passed, Failed: $failed_count"
	exit 0
fi
