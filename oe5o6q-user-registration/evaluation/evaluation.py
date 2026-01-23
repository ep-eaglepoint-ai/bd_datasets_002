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

TASK_NAME = "User Registration Function"
TEST_FILE = "tests/test_registration.py"
REPOSITORY_AFTER = "repository_after"
EVALUATION_DIR = Path(__file__).parent

def generate_run_id() -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))

def get_git_info():
    git_info = {"git_commit": "unknown", "git_branch": "unknown"}
    try:
        git_info["git_commit"] = subprocess.check_output(["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL, text=True).strip()[:8]
        git_info["git_branch"] = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL, text=True).strip()
    except Exception:
        pass
    return git_info

def get_environment_info():
    git_info = get_git_info()
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "hostname": socket.gethostname(),
        "git_commit": git_info["git_commit"],
        "git_branch": git_info["git_branch"]
    }

def run_tests():
    print(f"\n{'='*60}")
    print(f"RUNNING TESTS: {REPOSITORY_AFTER}")
    print(f"{'='*60}")

    env = os.environ.copy()
    env["REPO_PATH"] = REPOSITORY_AFTER

    cmd = ["pytest", "-v", TEST_FILE]

    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        stdout = result.stdout
        stderr = result.stderr
        exit_code = result.returncode

        test_results = []
        matches = re.findall(r"^(tests/.*::\S+)\s+(PASSED|FAILED|ERROR|SKIPPED)", stdout, re.MULTILINE)

        for nodeid, status in matches:
            test_results.append({
                "nodeid": nodeid,
                "name": nodeid.split("::")[-1],
                "outcome": status.lower()
            })

        summary = {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0}
        
        last_line_match = re.search(r"==+ (.*) in [\d\.]+s ==+", stdout)
        if last_line_match:
            parts = last_line_match.group(1).split(", ")
            for part in parts:
                count_match = re.match(r"(\d+)\s+(\w+)", part.strip())
                if count_match:
                    count = int(count_match.group(1))
                    category = count_match.group(2)
                    
                    if category == "passed":
                        summary["passed"] = count
                    elif category == "failed":
                        summary["failed"] = count
                    elif category in ["error", "errors"]:
                        summary["errors"] = count
                    elif category == "skipped":
                        summary["skipped"] = count
            
            summary["total"] = summary["passed"] + summary["failed"] + summary["errors"] + summary["skipped"]
        else:
            summary["passed"] = len([t for t in test_results if t['outcome'] == 'passed'])
            summary["failed"] = len([t for t in test_results if t['outcome'] == 'failed'])
            summary["errors"] = len([t for t in test_results if t['outcome'] == 'error'])
            summary["skipped"] = len([t for t in test_results if t['outcome'] == 'skipped'])
            summary["total"] = len(test_results)

        success = (summary["failed"] == 0 and summary["errors"] == 0 and exit_code == 0)

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
    run_id = generate_run_id()
    started_at = datetime.datetime.now(datetime.UTC)

    print(f"\n{'='*60}")
    print(f"EVALUATION: {TASK_NAME}")
    print(f"{'='*60}")
    print(f"Run ID: {run_id}")
    print(f"Started at: {started_at.isoformat()}")

    results = run_tests()

    finished_at = datetime.datetime.now(datetime.UTC)
    duration = (finished_at - started_at).total_seconds()

    success = results["success"]
    error_message = None if success else "Tests failed"

    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 2),
        "success": success,
        "error": error_message,
        "environment": get_environment_info(),
        "results": results
    }

    date_str = started_at.strftime("%Y-%m-%d")
    time_str = started_at.strftime("%H-%M-%S")
    output_dir = EVALUATION_DIR / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "report.json"

    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    if success:
        Path("/tmp/EVALUATION_SUCCESS").touch()
    else:
        Path("/tmp/EVALUATION_FAILED").touch()

    print(f"\n{'='*60}")
    print("EVALUATION SUMMARY")
    print(f"{'='*60}")
    print(f"\nTests: {results['summary']['passed']}/{results['summary']['total']} passed")
    print(f"Status: {'✅ PASS' if success else '❌ FAIL'}")
    print(f"\nReport: {report_path}")
    print(f"Duration: {round(duration, 2)}s")
    print(f"{'='*60}\n")

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()