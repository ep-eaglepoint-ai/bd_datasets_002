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
TASK_NAME = "FastAPI Product Catalog API Performance Optimization"
TEST_FILE = "tests/test_main.py"
EVALUATION_DIR = Path(__file__).parent
REPOSITORY_BEFORE = "repository_before"
REPOSITORY_AFTER = "repository_after"

def generate_run_id() -> str:
    """Generate a unique run ID."""
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))

def get_git_info():
    """Extract git info safely."""
    git_info = {"git_commit": "unknown", "git_branch": "unknown"}
    try:
        git_info["git_commit"] = subprocess.check_output(["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL, text=True).strip()[:8]
        git_info["git_branch"] = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL, text=True).strip()
    except Exception:
        pass
    return git_info

def get_environment_info():
    """Get detailed environment information."""
    git_info = get_git_info()
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "hostname": socket.gethostname(),
        "git_commit": git_info["git_commit"],
        "git_branch": git_info["git_branch"]
    }

def run_tests_native(test_file: str, repo_path: str, repo_name: str):
    """Run tests using standard pytest output and parse the console text."""
    print(f"\n{'='*60}")
    print(f"RUNNING TESTS: {repo_name} ({repo_path})")
    print(f"{'='*60}")

    env = os.environ.copy()
    env["REPO_PATH"] = repo_path

    # Run pytest with -v to get verbose output for parsing
    cmd = ["pytest", "-v", test_file]

    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding='utf-8')
        stdout = result.stdout
        stderr = result.stderr
        exit_code = result.returncode

        # Parse test results from stdout
        test_results = []
        matches = re.findall(r"^(tests/.*::\S+)\s+(PASSED|FAILED|ERROR|SKIPPED|XFAIL|XPASS)", stdout, re.MULTILINE)

        for nodeid, status in matches:
            outcome = status.lower()
            test_results.append({
                "nodeid": nodeid,
                "name": nodeid.split("::")[-1],
                "outcome": outcome
            })

        summary = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "errors": 0,
            "skipped": 0
        }
        
        # Try to parse the summary line
        # Example: =================== 4 passed, 4 xfailed, 1 xpassed in 3.01s ===================
        last_line_match = re.search(r"==+ (.*) in [\d\.]+s ==+", stdout)
        if last_line_match:
            parts = last_line_match.group(1).split(", ")
            for part in parts:
                part = part.strip()
                count_match = re.match(r"(\d+)\s+(\w+)", part)
                if count_match:
                    count = int(count_match.group(1))
                    category = count_match.group(2)
                    
                    if category == "passed":
                        summary["passed"] += count
                    elif category == "failed":
                        summary["failed"] += count
                    elif category == "error":
                        summary["errors"] += count
                    elif category == "skipped":
                        summary["skipped"] += count
                    elif category == "xfailed":
                        summary["failed"] += count  # Treat xfail as failure per requirements
                    elif category == "xpassed":
                         # Treat xpass as passed (unexpected pass is still a pass in terms of execution)
                         # or keep separate? Report format only has passed/failed/errors/skipped.
                        summary["passed"] += count
            
            summary["total"] = sum(summary.values())
        else:
             # Fallback to manual counting if summary line missing
            if len(test_results) > 0:
                summary["passed"] = len([t for t in test_results if t['outcome'] in ['passed', 'xpass']])
                summary["failed"] = len([t for t in test_results if t['outcome'] in ['failed', 'xfail', 'error']])
                summary["errors"] = 0 # Included in failed/error outcome ideally
                summary["skipped"] = len([t for t in test_results if t['outcome'] == 'skipped'])
                summary["total"] = len(test_results)

        # Force success to be False if there are failures, regardless of exit code
        success = (summary["failed"] == 0 and summary["errors"] == 0)

        return {
            "success": success,
            "exit_code": exit_code,
            "tests": test_results,
            "summary": summary,
            "stdout": stdout,
            "stderr": stderr
        }

    except Exception as e:
        return {
            "success": False,
            "exit_code": 1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 1, "skipped": 0},
            "stdout": "",
            "stderr": str(e)
        }

def main():
    SUCCESS_ICON = "✅"
    FAILURE_ICON = "❌"

    run_id = generate_run_id()
    started_at = datetime.datetime.now(datetime.UTC)

    print(f"\n{'='*60}")
    print(f"EVALUATION: {TASK_NAME}")
    print(f"{'='*60}")
    print(f"Run ID: {run_id}")
    print(f"Started at: {started_at.isoformat()}")

    before_results = run_tests_native(TEST_FILE, REPOSITORY_BEFORE, "repository_before")
    after_results = run_tests_native(TEST_FILE, REPOSITORY_AFTER, "repository_after")

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

    # Success condition: after implementation tests passed
    success = after_results["success"]
    error_message = None if success else "After implementation tests failed"

    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": float(round(duration, 6)),
        "success": success,
        "error": error_message,
        "environment": get_environment_info(),
        "results": {
            "before": before_results,
            "after": after_results,
            "comparison": comparison
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
    print(f"  Overall: {SUCCESS_ICON if before_results['success'] else FAILURE_ICON}")
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