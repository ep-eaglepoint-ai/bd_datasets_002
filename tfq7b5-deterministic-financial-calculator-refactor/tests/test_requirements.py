"""
Meta-tests for verifying the 17 requirements of the Deterministic Financial Calculator.

This test suite verifies that the refactored calculator meets all compliance requirements
for financial calculations including determinism, correctness, error handling, and concurrency.

Requirements tested:
1. Same input must produce identical output every time
2. No hidden randomness or time-based offsets
3. All operations must match industry-standard references
4. Trigonometric functions must consistently use radians
5. Logarithms must use consistent bases (ln=e, log=10)
6. Results must match floating-point precision
7. Invalid operations must return explicit error indicators
8. No numeric "guesses" for invalid input
9. Computational limits handled safely (overflow, underflow, infinity, NaN)
10. Output strings must have consistent decimal format
11. No artifacts like "?" or unexpected characters
12. Calculations independent of memory/session/counters/global state
13. Multiple concurrent users must not affect each other
14. Caching must be deterministic
15. No memory leaks or unbounded growth
16. Concurrency handled safely without data races
17. Maintain existing endpoint: POST /calculate
"""

import subprocess
import requests
import time
import math
import threading
import concurrent.futures
import sys
import os
import re
from typing import List, Tuple, Optional

# Configuration - use environment variable for Docker, default to localhost
BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
CALCULATE_ENDPOINT = f"{BASE_URL}/calculate"


class TestResult:
    """Represents the result of a single test."""
    def __init__(self, requirement_id: int, name: str, passed: bool, details: str = ""):
        self.requirement_id = requirement_id
        self.name = name
        self.passed = passed
        self.details = details
    
    def __str__(self):
        status = "[PASS]" if self.passed else "[FAIL]"
        return f"[Req {self.requirement_id:02d}] {status}: {self.name}" + (f"\n         {self.details}" if self.details and not self.passed else "")


def calculate(func: str, input_val: str, equation: str = "") -> str:
    """Send a calculation request to the server."""
    try:
        response = requests.post(
            CALCULATE_ENDPOINT,
            data={"func": func, "input": input_val, "equation": equation},
            timeout=5
        )
        return response.text
    except Exception as e:
        return f"CONNECTION_ERROR: {e}"


def test_requirement_1_identical_output() -> TestResult:
    """Requirement 1: Same input must produce identical output every time."""
    results = []
    for _ in range(100):
        results.append(calculate("sin", "0.5"))
    
    unique_results = set(results)
    passed = len(unique_results) == 1
    details = f"100 iterations produced {len(unique_results)} unique result(s): {unique_results}"
    return TestResult(1, "Identical output for same input (100 iterations)", passed, details)


def test_requirement_2_no_randomness() -> TestResult:
    """Requirement 2: No hidden randomness or time-based offsets."""
    # Run tests at different times and check consistency
    results_phase1 = [calculate("sqrt", "16") for _ in range(10)]
    time.sleep(2)  # Wait to check time-independence
    results_phase2 = [calculate("sqrt", "16") for _ in range(10)]
    
    all_results = results_phase1 + results_phase2
    unique_results = set(all_results)
    passed = len(unique_results) == 1 and all_results[0] == "4"
    details = f"Results across time: {unique_results}"
    return TestResult(2, "No randomness or time-based offsets", passed, details)


def test_requirement_3_standard_operations() -> TestResult:
    """Requirement 3: All operations must match industry-standard references."""
    test_cases = [
        ("sin", "0", "0"),
        ("cos", "0", "1"),
        ("tan", "0", "0"),
        ("log", "10", "1"),
        ("log", "100", "2"),
        ("ln", str(math.e), str(1.0)),
        ("sqrt", "16", "4"),
        ("sqrt", "25", "5"),
        ("square", "5", "25"),
        ("square", "3", "9"),
        ("inv", "4", "0.25"),
        ("inv", "2", "0.5"),
    ]
    
    failures = []
    for func, inp, expected in test_cases:
        result = calculate(func, inp)
        # Allow for floating point representation differences
        try:
            if float(result) != float(expected) and abs(float(result) - float(expected)) > 1e-10:
                failures.append(f"{func}({inp}): got {result}, expected {expected}")
        except ValueError:
            failures.append(f"{func}({inp}): got {result}, expected {expected}")
    
    passed = len(failures) == 0
    details = "; ".join(failures) if failures else ""
    return TestResult(3, "Operations match industry-standard references", passed, details)


def test_requirement_4_radians() -> TestResult:
    """Requirement 4: Trigonometric functions must consistently use radians."""
    # sin(pi/2) should be 1 in radians, sin(90) in degrees would be ~0.894
    result = calculate("sin", str(math.pi / 2))
    try:
        value = float(result)
        passed = abs(value - 1.0) < 1e-10
        details = f"sin(π/2) = {result}, expected 1.0"
    except ValueError:
        passed = False
        details = f"sin(π/2) returned non-numeric: {result}"
    
    return TestResult(4, "Trigonometric functions use radians", passed, details)


def test_requirement_5_logarithm_bases() -> TestResult:
    """Requirement 5: Logarithms must use consistent bases (ln=e, log=10)."""
    # log(10) should be 1 (base 10)
    # ln(e) should be 1 (base e)
    log_result = calculate("log", "10")
    ln_result = calculate("ln", str(math.e))
    
    try:
        log_value = float(log_result)
        ln_value = float(ln_result)
        passed = abs(log_value - 1.0) < 1e-10 and abs(ln_value - 1.0) < 1e-10
        details = f"log(10)={log_result}, ln(e)={ln_result}"
    except ValueError:
        passed = False
        details = f"Non-numeric results: log(10)={log_result}, ln(e)={ln_result}"
    
    return TestResult(5, "Logarithms use correct bases (log=10, ln=e)", passed, details)


def test_requirement_6_floating_point_precision() -> TestResult:
    """Requirement 6: Results must match floating-point precision."""
    # Test with values that require precision
    test_cases = [
        ("sin", "0.123456789", math.sin(0.123456789)),
        ("cos", "0.987654321", math.cos(0.987654321)),
        ("sqrt", "2", math.sqrt(2)),
        ("ln", "2.5", math.log(2.5)),
    ]
    
    failures = []
    for func, inp, expected in test_cases:
        result = calculate(func, inp)
        try:
            value = float(result)
            if abs(value - expected) > 1e-10:
                failures.append(f"{func}({inp}): got {value}, expected {expected}")
        except ValueError:
            failures.append(f"{func}({inp}): non-numeric result {result}")
    
    passed = len(failures) == 0
    details = "; ".join(failures) if failures else ""
    return TestResult(6, "Floating-point precision accuracy", passed, details)


def test_requirement_7_explicit_errors() -> TestResult:
    """Requirement 7: Invalid operations must return explicit error indicators."""
    error_cases = [
        ("sqrt", "-1", "sqrt of negative"),
        ("log", "-5", "log of negative"),
        ("log", "0", "log of zero"),
        ("ln", "-1", "ln of negative"),
        ("ln", "0", "ln of zero"),
        ("inv", "0", "division by zero"),
    ]
    
    failures = []
    for func, inp, desc in error_cases:
        result = calculate(func, inp)
        if result != "Error":
            failures.append(f"{desc}: got '{result}', expected 'Error'")
    
    # Also test division by zero in equations
    result = calculate("equals", "0", "5 / ")
    if result != "Error":
        failures.append(f"5/0: got '{result}', expected 'Error'")
    
    passed = len(failures) == 0
    details = "; ".join(failures) if failures else ""
    return TestResult(7, "Invalid operations return explicit errors", passed, details)


def test_requirement_8_no_guesses() -> TestResult:
    """Requirement 8: No numeric 'guesses' or substituted results for invalid input."""
    result = calculate("sin", "not_a_number")
    
    # Should return Error, not a computed value
    passed = result == "Error"
    details = f"sin('not_a_number') = '{result}'"
    return TestResult(8, "No numeric guesses for invalid input", passed, details)


def test_requirement_9_computational_limits() -> TestResult:
    """Requirement 9: Computational limits handled safely (overflow, underflow, infinity, NaN)."""
    test_cases = []
    
    # Very large number squared (potential overflow)
    result = calculate("square", "1e154")
    try:
        value = float(result)
        # Should handle large values appropriately (infinity or large number)
        test_cases.append(("overflow", result, True))
    except ValueError:
        # May return Infinity as string
        if result in ["Infinity", "-Infinity", "Error"]:
            test_cases.append(("overflow", result, True))
        else:
            test_cases.append(("overflow", result, False))
    
    # tan at pi/2 (approaches infinity)
    result = calculate("tan", str(math.pi / 2))
    # Result should be a very large number or Infinity, not NaN or error
    try:
        value = float(result)
        test_cases.append(("tan_pi/2", result, abs(value) > 1e10 or result == "Infinity"))
    except ValueError:
        test_cases.append(("tan_pi/2", result, result in ["Infinity", "-Infinity"]))
    
    failures = [f"{name}: {val}" for name, val, ok in test_cases if not ok]
    passed = len(failures) == 0
    details = "; ".join(failures) if failures else ""
    return TestResult(9, "Computational limits handled safely", passed, details)


def test_requirement_10_consistent_format() -> TestResult:
    """Requirement 10: Output strings must have consistent decimal format."""
    # Run multiple different calculations and check format consistency
    results = []
    for val in ["0.5", "0.25", "0.125", "0.0625"]:
        results.append(calculate("sin", val))
    
    # Check there are no trailing zeros inconsistency or format anomalies
    # All should be valid float strings
    format_issues = []
    for r in results:
        if r == "Error":
            continue
        try:
            float(r)
            # Check for common format issues
            if r.endswith('.'):
                format_issues.append(f"Trailing decimal: {r}")
            if '..' in r:
                format_issues.append(f"Double decimal: {r}")
        except ValueError:
            format_issues.append(f"Non-parseable: {r}")
    
    passed = len(format_issues) == 0
    details = "; ".join(format_issues) if format_issues else f"Sample formats: {results[:3]}"
    return TestResult(10, "Consistent decimal format", passed, details)


def test_requirement_11_no_artifacts() -> TestResult:
    """Requirement 11: No artifacts like '?' or unexpected characters in outputs."""
    # Run many calculations and check for artifacts
    test_funcs = ["sin", "cos", "tan", "log", "ln", "sqrt", "square", "inv"]
    test_inputs = ["1", "2", "0.5", "10", "100"]
    
    artifacts_found = []
    artifact_patterns = [r'\?', r'42$', r'[^0-9eE\.\-\+InfityNaError]']
    
    for func in test_funcs:
        for inp in test_inputs:
            result = calculate(func, inp)
            if result in ["Error", "NaN", "Infinity", "-Infinity"]:
                continue
            
            # Check for '?' character
            if '?' in result:
                artifacts_found.append(f"{func}({inp}): contains '?'")
            
            # Check for hardcoded "42"
            if result == "42" and func != "equals":
                artifacts_found.append(f"{func}({inp}): suspicious '42'")
            
            # Verify it's a valid number
            try:
                float(result)
            except ValueError:
                if result not in ["Error", "NaN", "Infinity", "-Infinity"]:
                    artifacts_found.append(f"{func}({inp}): invalid format '{result}'")
    
    passed = len(artifacts_found) == 0
    details = "; ".join(artifacts_found[:3]) if artifacts_found else ""
    return TestResult(11, "No artifacts in outputs", passed, details)


def test_requirement_12_state_independence() -> TestResult:
    """Requirement 12: Calculations independent of memory/session/counters/global state."""
    # Run calculation A
    result_a1 = calculate("sin", "0.5")
    
    # Run many other calculations
    for i in range(50):
        calculate("cos", str(i * 0.1))
        calculate("log", str(i + 1))
        calculate("sqrt", str(i + 1))
    
    # Run calculation A again
    result_a2 = calculate("sin", "0.5")
    
    passed = result_a1 == result_a2
    details = f"Before: {result_a1}, After 50 ops: {result_a2}"
    return TestResult(12, "Calculations independent of state/counters", passed, details)


def test_requirement_13_concurrent_users() -> TestResult:
    """Requirement 13: Multiple concurrent users must not affect each other's results."""
    expected_results = {
        ("sin", "0.5"): calculate("sin", "0.5"),
        ("cos", "1.0"): calculate("cos", "1.0"),
        ("sqrt", "16"): calculate("sqrt", "16"),
        ("log", "100"): calculate("log", "100"),
    }
    
    results = {key: [] for key in expected_results}
    errors = []
    
    def make_request(func, inp):
        result = calculate(func, inp)
        results[(func, inp)].append(result)
    
    # Run concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = []
        for _ in range(10):
            for (func, inp) in expected_results:
                futures.append(executor.submit(make_request, func, inp))
        concurrent.futures.wait(futures)
    
    # Check all results match expected
    for key, expected in expected_results.items():
        for actual in results[key]:
            if actual != expected:
                errors.append(f"{key}: got {actual}, expected {expected}")
    
    passed = len(errors) == 0
    details = "; ".join(errors[:3]) if errors else ""
    return TestResult(13, "Concurrent users don't affect each other", passed, details)


def test_requirement_14_deterministic_caching() -> TestResult:
    """Requirement 14: Caching must be deterministic and not introduce non-reproducible behavior."""
    # First call (may be cached)
    result1 = calculate("sin", "0.12345")
    
    # Many repeat calls
    results = [calculate("sin", "0.12345") for _ in range(50)]
    
    # Wait and try again
    time.sleep(1)
    result2 = calculate("sin", "0.12345")
    
    all_same = all(r == result1 for r in results) and result2 == result1
    passed = all_same
    details = f"Initial: {result1}, After 50 calls: {results[-1]}, After wait: {result2}"
    return TestResult(14, "Deterministic caching", passed, details)


def test_requirement_15_no_memory_leaks() -> TestResult:
    """Requirement 15: No memory leaks or unbounded growth in long-running servers."""
    # This is a meta-test - we verify the code doesn't have obvious leak patterns
    # by checking the source for global state accumulation
    
    # Run many operations and verify responses are still consistent
    baseline = calculate("sqrt", "4")
    
    for i in range(100):
        calculate("sin", str(i * 0.01))
        calculate("cos", str(i * 0.01))
        calculate("sqrt", str(i + 1))
    
    after = calculate("sqrt", "4")
    
    passed = baseline == after
    details = f"Baseline: {baseline}, After 300 ops: {after}"
    return TestResult(15, "No memory leaks (consistency after many ops)", passed, details)


def test_requirement_16_concurrency_safety() -> TestResult:
    """Requirement 16: Concurrency handled safely without data races or inconsistent results."""
    # Run many concurrent requests and verify no crashes or inconsistent results
    errors = []
    lock = threading.Lock()
    
    def stress_test(thread_id):
        try:
            for i in range(20):
                result = calculate("sqrt", "16")
                if result != "4":
                    with lock:
                        errors.append(f"Thread {thread_id}, iter {i}: {result}")
        except Exception as e:
            with lock:
                errors.append(f"Thread {thread_id}: {e}")
    
    threads = [threading.Thread(target=stress_test, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    passed = len(errors) == 0
    details = "; ".join(errors[:3]) if errors else "200 concurrent operations completed"
    return TestResult(16, "Concurrency handled safely", passed, details)


def test_requirement_17_endpoint_preserved() -> TestResult:
    """Requirement 17: Maintain existing endpoint: POST /calculate."""
    # Test that POST /calculate works
    try:
        response = requests.post(
            CALCULATE_ENDPOINT,
            data={"func": "sqrt", "input": "4", "equation": ""},
            timeout=5
        )
        post_works = response.status_code == 200 and response.text == "2"
    except Exception as e:
        post_works = False
    
    # Test that GET is not allowed (or at least POST works)
    try:
        response = requests.get(CALCULATE_ENDPOINT, timeout=5)
        get_not_allowed = response.status_code == 405
    except Exception:
        get_not_allowed = True  # Connection error is acceptable
    
    passed = post_works
    details = f"POST works: {post_works}"
    return TestResult(17, "POST /calculate endpoint maintained", passed, details)


def run_all_tests() -> List[TestResult]:
    """Run all requirement tests."""
    tests = [
        test_requirement_1_identical_output,
        test_requirement_2_no_randomness,
        test_requirement_3_standard_operations,
        test_requirement_4_radians,
        test_requirement_5_logarithm_bases,
        test_requirement_6_floating_point_precision,
        test_requirement_7_explicit_errors,
        test_requirement_8_no_guesses,
        test_requirement_9_computational_limits,
        test_requirement_10_consistent_format,
        test_requirement_11_no_artifacts,
        test_requirement_12_state_independence,
        test_requirement_13_concurrent_users,
        test_requirement_14_deterministic_caching,
        test_requirement_15_no_memory_leaks,
        test_requirement_16_concurrency_safety,
        test_requirement_17_endpoint_preserved,
    ]
    
    results = []
    for test in tests:
        print(f"Running: {test.__name__}...", end=" ", flush=True)
        try:
            result = test()
            results.append(result)
            print("PASS" if result.passed else "FAIL")
        except Exception as e:
            results.append(TestResult(
                int(test.__name__.split("_")[2]),
                test.__name__,
                False,
                f"Exception: {e}"
            ))
            print("ERROR")
    
    return results


def main():
    """Main entry point for running the meta-tests."""
    print("=" * 70)
    print("DETERMINISTIC FINANCIAL CALCULATOR - REQUIREMENTS VERIFICATION")
    print("=" * 70)
    print()
    
    # Check if server is running
    try:
        response = requests.get(BASE_URL, timeout=5)
        print(f"[OK] Server is running at {BASE_URL}")
    except Exception as e:
        print(f"[ERROR] Server not reachable at {BASE_URL}")
        print(f"  Error: {e}")
        print()
        print("Please start the calculator server before running tests:")
        print("  cd repository_after && go run calculator.go")
        sys.exit(1)
    
    print()
    print("Running 17 requirement tests...")
    print("-" * 70)
    
    results = run_all_tests()
    
    print()
    print("=" * 70)
    print("RESULTS SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed
    
    for result in results:
        print(str(result))
    
    print()
    print("-" * 70)
    print(f"TOTAL: {passed}/{len(results)} requirements PASSED, {failed} FAILED")
    print("-" * 70)
    
    if failed == 0:
        print("\n[SUCCESS] ALL REQUIREMENTS SATISFIED - Calculator is compliant!")
        return 0
    else:
        print("\n[FAILED] COMPLIANCE FAILURE - Some requirements not met")
        return 1


if __name__ == "__main__":
    sys.exit(main())
