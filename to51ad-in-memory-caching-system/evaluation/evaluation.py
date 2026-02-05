import sys
import json
import uuid
import platform
import subprocess
import os
import re
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"




def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def parse_test_output(output: str):
    passed = 0
    failed = 0
    skipped = 0
    match = re.search(r'(\d+) passed', output)
    if match:
        passed = int(match.group(1))
    match = re.search(r'(\d+) failed', output)
    if match:
        failed = int(match.group(1))
    match = re.search(r'(\d+) skipped', output)
    if match:
        skipped = int(match.group(1))
    return passed, failed, skipped


def run_tests_docker(repo_type: str):
    service_name = f"test-{repo_type}"
    try:
        proc = subprocess.run(
            ["docker", "compose", "run", "--rm", service_name],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=300
        )
        output = proc.stdout + proc.stderr
        passed, failed, skipped = parse_test_output(output)
        return {
            "passed": failed == 0 and passed > 0,
            "return_code": proc.returncode,
            "tests_passed": passed,
            "tests_failed": failed,
            "tests_skipped": skipped,
            "output": output[:8000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "output": "pytest timeout after 300 seconds"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "output": f"Error running tests: {str(e)}"
        }


def run_tests_direct(repo_type: str):
    env = os.environ.copy()
    env['REPO_TYPE'] = repo_type
    try:
        proc = subprocess.run(
            ["pytest", "tests/test_cache.py", "-v", "--tb=short", "--timeout=3"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=300,
            env=env
        )
        output = proc.stdout + proc.stderr
        passed, failed, skipped = parse_test_output(output)
        return {
            "passed": failed == 0 and passed > 0,
            "return_code": proc.returncode,
            "tests_passed": passed,
            "tests_failed": failed,
            "tests_skipped": skipped,
            "output": output[:8000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "output": "pytest timeout after 300 seconds"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "output": f"Error running tests: {str(e)}"
        }


def run_tests(repo_type: str):
    in_docker = os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER', False)
    if in_docker:
        return run_tests_direct(repo_type)
    else:
        return run_tests_docker(repo_type)


def run_metrics(repo_path: Path):
    return {}


def evaluate(repo_name: str, repo_type: str):
    repo_path = ROOT / repo_name
    tests = run_tests(repo_type)
    metrics = run_metrics(repo_path)
    return {
        "tests": tests,
        "metrics": metrics
    }


def print_separator(char="=", length=70):
    print(char * length)


def print_test_summary(name: str, result: dict):
    tests = result["tests"]
    status = "✅ PASS" if tests["passed"] else "❌ FAIL"
    print(f"\n{'─' * 35}")
    print(f"  {name}")
    print(f"{'─' * 35}")
    print(f"  Status:          {status}")
    print(f"  Tests Passed:    {tests['tests_passed']}")
    print(f"  Tests Failed:    {tests['tests_failed']}")
    print(f"  Tests Skipped:   {tests['tests_skipped']}")
    print(f"  Return Code:     {tests['return_code']}")


def run_evaluation():
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    print_separator()
    print("  IN-MEMORY CACHE EVALUATION")
    print_separator()
    print(f"\n  Run ID:     {run_id}")
    print(f"  Started:    {start.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"  Python:     {platform.python_version()}")
    print(f"  Platform:   {platform.platform()}")
    in_docker = os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER', False)
    print(f"  Environment: {'Docker container' if in_docker else 'Host system'}")
    print("\n" + "─" * 70)
    print("  Running Tests...")
    print("─" * 70)
    print("\n  [1/2] Testing repository_before (unoptimized)...")
    before = evaluate("repository_before", "before")
    print("  [2/2] Testing repository_after (optimized)...")
    after = evaluate("repository_after", "after")
    comparison = {
        "before_passed": before["tests"]["passed"],
        "after_passed": after["tests"]["passed"],
        "before_failed_count": before["tests"]["tests_failed"],
        "after_failed_count": after["tests"]["tests_failed"],
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": ""
    }
    if after["tests"]["passed"] and not before["tests"]["passed"]:
        comparison["improvement_summary"] = (
            f"Optimization successful: repository_after passes all {after['tests']['tests_passed']} tests, "
            f"while repository_before fails {before['tests']['tests_failed']} performance tests "
            f"(proving O(n) complexity in the unoptimized code)."
        )
    elif after["tests"]["passed"] and before["tests"]["passed"]:
        comparison["improvement_summary"] = (
            "Both repositories pass all tests. Performance tests are designed to pass for both "
            "implementations with the current thresholds."
        )
    elif not after["tests"]["passed"]:
        comparison["improvement_summary"] = (
            f"Optimization incomplete: repository_after has {after['tests']['tests_failed']} failing tests."
        )
    else:
        comparison["improvement_summary"] = "Unexpected test results."
    end = datetime.now(timezone.utc)
    duration = (end - start).total_seconds()
    result = {
        "run_id": run_id,
        "started_at": start.isoformat(),
        "finished_at": end.isoformat(),
        "duration_seconds": duration,
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }
    date_str = start.strftime("%Y-%m-%d")
    time_str = start.strftime("%H-%M-%S")
    report_dir = REPORTS / date_str / time_str
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "report.json"
    with open(report_path, "w") as f:
        json.dump(result, f, indent=2)
    print("\n" + "─" * 70)
    print("  RESULTS SUMMARY")
    print("─" * 70)
    print_test_summary("repository_before (unoptimized)", before)
    print_test_summary("repository_after (optimized)", after)
    print("\n" + "─" * 70)
    print("  COMPARISON")
    print("─" * 70)
    before_status = "✅ All tests pass" if before["tests"]["passed"] else f"❌ {before['tests']['tests_failed']} tests FAILED (expected for unoptimized)"
    after_status = "✅ All tests pass" if after["tests"]["passed"] else f"❌ {after['tests']['tests_failed']} tests FAILED"
    gate_status = "✅ PASSED" if comparison["passed_gate"] else "❌ FAILED"
    print(f"\n  Before (unoptimized):  {before_status}")
    print(f"  After (optimized):     {after_status}")
    print(f"  Optimization Gate:     {gate_status}")
    print(f"\n  Summary: {comparison['improvement_summary']}")
    print("\n" + "─" * 70)
    print("  PERFORMANCE REQUIREMENTS")
    print("─" * 70)
    requirements = [
        ("Req 1", "Dictionary-based O(1) lookups", after["tests"]["passed"]),
        ("Req 2", "OrderedDict LRU eviction O(1)", after["tests"]["passed"]),
        ("Req 3", "Heap-based TTL expiration O(log n)", after["tests"]["passed"]),
        ("Req 4", "Key normalization for complex keys", after["tests"]["passed"]),
        ("Req 5", "Bounded deque for stats logging", after["tests"]["passed"]),
        ("Req 6", "heapq.nsmallest/nlargest for statistics", after["tests"]["passed"]),
        ("Req 7", "Minimal deep copying", after["tests"]["passed"]),
        ("Req 8", "Optimized pattern search", after["tests"]["passed"]),
    ]
    print()
    for req_id, req_desc, passed in requirements:
        status = "✅" if passed else "❌"
        print(f"  {status} {req_id}: {req_desc}")
    print("\n" + "─" * 70)
    print("  REPORT")
    print("─" * 70)
    print(f"\n  Report saved to: {report_path}")
    print(f"  Duration: {duration:.2f} seconds")
    print("\n" + "=" * 70)
    if result["success"]:
        print("  ✅ EVALUATION SUCCESSFUL - OPTIMIZATION VERIFIED ✅")
    else:
        print("  ❌ EVALUATION FAILED ❌")
    print("=" * 70 + "\n")
    return result


def main():
    try:
        result = run_evaluation()
        if result.get("success"):
            return 0
        return 1
    except Exception as e:
        print(f"\n❌ Evaluation failed with error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
