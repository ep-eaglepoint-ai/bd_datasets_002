#!/usr/bin/env python3
import os
import json
import subprocess
import sys
import datetime
import socket
import platform
import random
import string
import re
from pathlib import Path

# =================================================================
# EVALUATION CONFIGURATION
# =================================================================
TASK_NAME = "PostgreSQL Billing Function Optimization"
TEST_FILES_BEFORE = ["tests/test_before.py"]
TEST_FILES_AFTER = ["tests/test_after.py"]
EVALUATION_DIR = Path(__file__).parent
REPOSITORY_BEFORE = "repository_before"
REPOSITORY_AFTER = "repository_after"

def generate_run_id() -> str:
    """Generate a unique run ID."""
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))

def get_git_info():
    """Extract git info safely."""
    git_info = {"commit": "unknown", "branch": "unknown"}
    try:
        git_info["commit"] = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL, text=True).strip()
        git_info["branch"] = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL, text=True).strip()
    except Exception:
        pass
    return git_info

def run_tests_native(test_files: list, repo_path: str, repo_name: str):
    """Run tests using standard pytest output and parse the console text."""
    print(f"\n{'='*60}")
    print(f"RUNNING TESTS: {repo_name} ({repo_path})")
    print(f"{'='*60}")

    env = os.environ.copy()
    env["REPO_PATH"] = repo_path

    cmd = ["pytest", "-v", *test_files]

    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding='utf-8')
        output = result.stdout + result.stderr

        test_results = []
        matches = re.findall(r"^(tests/.*::.*)\s+(PASSED|FAILED|ERROR|SKIPPED)", output, re.MULTILINE)

        passed = 0
        failed = 0
        errors = 0
        skipped = 0

        for nodeid, status in matches:
            test_results.append({
                "nodeid": f"{repo_name}::{nodeid}",
                "name": nodeid,
                "outcome": status.lower(),
                "message": ""
            })
            if status == "PASSED": passed += 1
            elif status == "FAILED": failed += 1
            elif status == "ERROR": errors += 1
            elif status == "SKIPPED": skipped += 1

        if not test_results:
            summary_match = re.search(r"==.* ((\d+) passed)?.* ((\d+) failed)?.* ((\d+) error)?.*==", output)
            if summary_match:
                passed = int(summary_match.group(2)) if summary_match.group(2) else 0
                failed = int(summary_match.group(4)) if summary_match.group(4) else 0
                errors = int(summary_match.group(6)) if summary_match.group(6) else 0

        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "tests": test_results,
            "summary": {
                "total": passed + failed + errors + skipped,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "skipped": skipped
            },
            "raw_output": output if not test_results else None
        }
    except Exception as e:
        return {
            "success": False,
            "exit_code": 1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 1, "skipped": 0},
            "error": str(e)
        }

def main():
    SUCCESS_ICON = "[PASS]"
    FAILURE_ICON = "[FAIL]"

    run_id = generate_run_id()
    started_at = datetime.datetime.now(datetime.UTC)

    print(f"\n{'='*60}")
    print(f"EVALUATION: {TASK_NAME}")
    print(f"{'='*60}")
    print(f"Run ID: {run_id}")
    print(f"Started at: {started_at.isoformat()}")

    before_results = run_tests_native(TEST_FILES_BEFORE, REPOSITORY_BEFORE, "repository_before")
    after_results = run_tests_native(TEST_FILES_AFTER, REPOSITORY_AFTER, "repository_after")

    finished_at = datetime.datetime.now(datetime.UTC)
    duration = (finished_at - started_at).total_seconds()

    comparison = {
        "before_tests_passed": before_results["success"],
        "after_tests_passed": after_results["success"],
        "before_total": before_results["summary"]["total"],
        "before_passed": before_results["summary"]["passed"],
        "before_failed": before_results["summary"]["failed"],
        "after_total": after_results["summary"]["total"],
        "after_passed": after_results["summary"]["passed"],
        "after_failed": after_results["summary"]["failed"],
    }

    # Expected: before tests fail (8 failed), after tests pass (15 passed)
    success = after_results["success"]
    verdict = "SUCCESS" if success else "FAILURE"

    git_info = get_git_info()
    report = {
        "metadata": {
            "run_id": run_id,
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "duration_seconds": round(duration, 6),
        },
        "environment": {
            "platform": sys.platform,
            "runtime": f"Python {sys.version.split()[0]}",
            "architecture": platform.machine(),
            "hostname": socket.gethostname(),
            "git_commit": git_info["commit"],
            "git_branch": git_info["branch"]
        },
        "verdict": {
            "status": verdict,
            "success": success,
            "error": None if success else "After implementation tests failed"
        },
        "results": {
            "before": before_results,
            "after": after_results,
            "comparison": comparison
        },
        "summary": {
            "total_requirements": comparison["after_total"],
            "satisfied_requirements": comparison["after_passed"],
            "failed_requirements": comparison["after_failed"]
        }
    }

    date_str = started_at.strftime("%Y-%m-%d")
    time_str = started_at.strftime("%H-%M-%S")
    output_dir = EVALUATION_DIR / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "report.json"

    with open(report_path, "w", encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    # Write success marker for build script
    if success:
        Path("/tmp/EVALUATION_SUCCESS").touch()
    else:
        Path("/tmp/EVALUATION_FAILED").touch()

    print(f"\n{'='*60}")
    print("EVALUATION SUMMARY")
    print(f"{'='*60}")
    print(f"\nBefore Implementation ({REPOSITORY_BEFORE}):")
    print(f"  Overall: {SUCCESS_ICON if before_results['success'] else FAILURE_ICON + ' (Expected)'}")
    print(f"  Tests: {comparison['before_passed']}/{comparison['before_total']} passed")

    print(f"\nAfter Implementation ({REPOSITORY_AFTER}):")
    print(f"  Overall: {SUCCESS_ICON if after_results['success'] else FAILURE_ICON}")
    print(f"  Tests: {comparison['after_passed']}/{comparison['after_total']} passed")

    print(f"\nReport saved to: {report_path}")
    print(f"{'='*60}")
    print("EVALUATION COMPLETE")
    print(f"Duration: {round(duration, 2)}s")
    print(f"Success: {'YES' if success else 'NO'}")
    print(f"{'='*60}\n")

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
