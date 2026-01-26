"""
Evaluation script for Job Queue System test suite.
"""

import subprocess
import sys
import os
import re
import json
from datetime import datetime


def run_tests() -> dict:
    """Run pytest and return results."""
    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = "/app/repository_after"

        result = subprocess.run(
            ["python", "-m", "pytest", "tests/", "-v", "--tb=short"],
            capture_output=True,
            text=True,
            cwd="/app",
            env=env
        )

        output = result.stdout + result.stderr

        # Parse individual test results
        tests = []
        passed = 0
        failed = 0

        # Match test lines like: tests/test_job_queue.py::TestJob::test_job_create_valid PASSED
        test_pattern = re.compile(r'tests/test_job_queue\.py::(\S+)\s+(PASSED|FAILED)')

        for match in test_pattern.finditer(output):
            test_name = match.group(1).replace("::", " - ")
            status = match.group(2)
            is_passed = status == "PASSED"

            tests.append({
                "name": test_name,
                "passed": is_passed
            })

            if is_passed:
                passed += 1
            else:
                failed += 1

        return {
            "passed": passed,
            "failed": failed,
            "total": passed + failed,
            "tests": tests,
            "exit_code": result.returncode
        }
    except Exception as e:
        return {
            "passed": 0,
            "failed": 0,
            "total": 0,
            "tests": [],
            "exit_code": 1,
            "error": str(e)
        }


def save_report(results: dict) -> str:
    """Save evaluation report with timestamp in nested folder structure."""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")

    output_dir = f"/app/evaluation/{date_str}/{time_str}"
    os.makedirs(output_dir, exist_ok=True)

    report = {
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z",
        "repository_after": {
            "passed": results["passed"],
            "failed": results["failed"],
            "total": results["total"],
            "tests": results["tests"]
        }
    }

    filepath = f"{output_dir}/report.json"

    with open(filepath, "w") as f:
        json.dump(report, f, indent=2)

    return f"evaluation/{date_str}/{time_str}/report.json"


def main():
    print("=" * 60)
    print("Job Queue System - Evaluation")
    print("=" * 60)

    # Run tests on repository_after
    print("\n[repository_after]")
    results = run_tests()
    print(f"  Passed: {results['passed']}")
    print(f"  Failed: {results['failed']}")
    print(f"  Total:  {results['total']}")

    # Save report
    report_path = save_report(results)
    print(f"\n  Report: {report_path}")

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    if results["failed"] == 0 and results["passed"] > 0:
        print("PASS: All tests pass on repository_after")
        sys.exit(0)
    else:
        print("FAIL: Some tests failed on repository_after")
        sys.exit(1)


if __name__ == "__main__":
    main()
