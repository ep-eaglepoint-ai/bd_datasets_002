"""Evaluation runner for the distributed task queue system."""
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path


TASK_TITLE = "Distributed Task Queue Worker Nodes"


def run_tests(env_path: str) -> dict:
    """Run pytest and collect results."""
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{env_path}:{env.get('PYTHONPATH', '')}"
    
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short", "-q"],
        capture_output=True,
        text=True,
        env=env,
        cwd="/app" if os.path.exists("/app") else os.getcwd(),
    )
    
    return parse_pytest_output(result.stdout, result.stderr, result.returncode)


def parse_pytest_output(stdout: str, stderr: str, returncode: int) -> dict:
    """Parse pytest output to extract test results."""
    import re
    
    full_output = stdout + "\n" + stderr
    lines = full_output.strip().split("\n")
    
    passed = 0
    failed = 0
    errors = 0
    skipped = 0
    test_results = []
    
    for line in lines:
        if "PASSED" in line and "::" in line:
            passed += 1
            try:
                test_name = line.split("::")[1].split()[0]
                test_results.append({"name": test_name, "status": "passed"})
            except (IndexError, AttributeError):
                pass
        elif "FAILED" in line and "::" in line:
            failed += 1
            try:
                test_name = line.split("::")[1].split()[0]
                test_results.append({"name": test_name, "status": "failed"})
            except (IndexError, AttributeError):
                pass
        elif "ERROR" in line and "::" in line:
            errors += 1
            try:
                test_name = line.split("::")[1].split()[0]
                test_results.append({"name": test_name, "status": "error"})
            except (IndexError, AttributeError):
                pass
    
    summary_match = re.search(r"(\d+)\s+passed", full_output)
    if summary_match:
        passed = int(summary_match.group(1))
    
    failed_match = re.search(r"(\d+)\s+failed", full_output)
    if failed_match:
        failed = int(failed_match.group(1))
    
    error_match = re.search(r"(\d+)\s+error", full_output)
    if error_match:
        errors = int(error_match.group(1))
    
    skipped_match = re.search(r"(\d+)\s+skipped", full_output)
    if skipped_match:
        skipped = int(skipped_match.group(1))
    
    return {
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "skipped": skipped,
        "total": passed + failed + errors + skipped,
        "test_results": test_results,
        "returncode": returncode,
        "stdout": stdout,
        "stderr": stderr,
    }


def print_test_results(results: dict, env_name: str):
    """Print formatted test results."""
    total = results["total"]
    passed = results["passed"]
    failed = results["failed"]
    errors = results["errors"]
    skipped = results["skipped"]
    
    print(f"Environment: {env_name}")
    print(f"Tests directory: /app/tests")
    print()
    print(f"Results: {passed} passed, {failed} failed, {errors} errors, {skipped} skipped (total: {total})")
    
    for test in results.get("test_results", []):
        status = test["status"]
        name = test["name"]
        if status == "passed":
            print(f"  [✓ PASS] tests/test_task_queue.py::{name}")
        elif status == "failed":
            print(f"  [✗ FAIL] tests/test_task_queue.py::{name}")
        elif status == "error":
            print(f"  [✗ ERROR] tests/test_task_queue.py::{name}")


def save_report(report: dict, base_dir: str = "evaluation/reports"):
    """Save JSON report to file."""
    now = datetime.utcnow()
    date_dir = now.strftime("%Y-%m-%d")
    time_dir = now.strftime("%H-%M-%S")
    
    report_dir = Path(base_dir) / date_dir / time_dir
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report_path = report_dir / "report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    
    return str(report_path)


def main():
    """Main evaluation entry point."""
    run_id = str(uuid.uuid4())
    start_time = datetime.utcnow()
    
    print(f"Run ID: {run_id}")
    print(f"Started at: {start_time.isoformat()}")
    print()
    print("=" * 60)
    print(f"{TASK_TITLE} EVALUATION")
    print("=" * 60)
    print()
    
    print("=" * 60)
    print("RUNNING TESTS (REPOSITORY_AFTER)")
    print("=" * 60)
    
    base_path = "/app" if os.path.exists("/app") else os.getcwd()
    after_path = os.path.join(base_path, "repository_after")
    
    after_results = run_tests(after_path)
    print_test_results(after_results, "repository_after")
    print()
    
    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()
    
    all_passed = after_results["failed"] == 0 and after_results["errors"] == 0
    overall_status = "PASSED" if all_passed else "FAILED"
    
    print("=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print()
    print(f"Implementation (repository_after):")
    print(f"  Overall: {overall_status}")
    print(f"  Tests: {after_results['passed']}/{after_results['total']} passed")
    print()
    
    print("=" * 60)
    print("EXPECTED BEHAVIOR CHECK")
    print("=" * 60)
    
    if all_passed:
        print("[✓ OK] All tests passed (expected)")
    else:
        print("[✗ FAIL] Some tests failed (unexpected)")
    print()
    
    report = {
        "run_id": run_id,
        "task_title": TASK_TITLE,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "duration_seconds": duration,
        "test_results": {
            "repository_after": {
                "passed": after_results["passed"],
                "failed": after_results["failed"],
                "errors": after_results["errors"],
                "skipped": after_results["skipped"],
                "total": after_results["total"],
                "tests": after_results.get("test_results", []),
            }
        },
        "overall_status": overall_status,
    }
    
    report_path = save_report(report)
    
    print(f"Report saved to:")
    print(f"{report_path}")
    print()
    print("=" * 60)
    print("EVALUATION COMPLETE")
    print("=" * 60)
    print(f"Run ID: {run_id}")
    print(f"Duration: {duration:.2f}s")
    print(f"Success: {'YES' if all_passed else 'NO'}")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
