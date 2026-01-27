#!/usr/bin/env python3

import os
import sys
import json
import uuid
import platform
import subprocess
from datetime import datetime
from pathlib import Path


def generate_run_id():
    return uuid.uuid4().hex[:8]


def get_git_info():
    git_info = {"git_commit": "unknown", "git_branch": "unknown"}
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            git_info["git_commit"] = result.stdout.strip()[:8]
    except Exception:
        pass
    
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            git_info["git_branch"] = result.stdout.strip()
    except Exception:
        pass
    
    return git_info


def get_environment_info():
    git_info = get_git_info()
    
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "hostname": platform.node(),
        "git_commit": git_info["git_commit"],
        "git_branch": git_info["git_branch"],
    }


def parse_pytest_verbose_output(output):
    tests = []
    lines = output.split('\n')
    
    for line in lines:
        line_stripped = line.strip()
        
        if '::' in line_stripped:
            outcome = None
            if ' PASSED' in line_stripped:
                outcome = "passed"
            elif ' FAILED' in line_stripped:
                outcome = "failed"
            elif ' ERROR' in line_stripped:
                outcome = "error"
            elif ' SKIPPED' in line_stripped:
                outcome = "skipped"
            
            if outcome:
                for status_word in [' PASSED', ' FAILED', ' ERROR', ' SKIPPED']:
                    if status_word in line_stripped:
                        nodeid = line_stripped.split(status_word)[0].strip()
                        break
                
                tests.append({
                    "nodeid": nodeid,
                    "name": nodeid.split("::")[-1] if "::" in nodeid else nodeid,
                    "outcome": outcome,
                })
    
    return tests


def run_tests(target_path, label):
    print(f"\nRUNNING TESTS: {label.upper()}")
    
    cmd = [
        sys.executable, "-m", "pytest",
        str(target_path),
        "-v",
        "--tb=short",
    ]
    
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path.cwd())
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            timeout=120
        )
        
        stdout = result.stdout
        stderr = result.stderr
        
        tests = parse_pytest_verbose_output(stdout)
        
        passed = sum(1 for t in tests if t["outcome"] == "passed")
        failed = sum(1 for t in tests if t["outcome"] == "failed")
        errors = sum(1 for t in tests if t["outcome"] == "error")
        skipped = sum(1 for t in tests if t["outcome"] == "skipped")
        total = len(tests)
        
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "tests": tests,
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "skipped": skipped,
            },
            "stdout": stdout,
            "stderr": stderr,
        }
    except Exception as e:
        print(f"Error running tests: {e}")
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 1, "skipped": 0},
            "stdout": "",
            "stderr": str(e),
        }


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()
    
    run_id = generate_run_id()
    started_at = datetime.now()
    
    project_root = Path.cwd()
    before_path = project_root / "repository_before" / "test_csv_to_json.py"
    after_path = project_root / "repository_after" / "test_csv_to_json.py"
    
    before_results = run_tests(before_path, "before")
    after_results = run_tests(after_path, "after")
    
    finished_at = datetime.now()
    duration = (finished_at - started_at).total_seconds()
    
    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 6),
        "success": after_results["success"],
        "error": None if after_results["success"] else "After implementation tests failed",
        "environment": get_environment_info(),
        "results": {
            "before": before_results,
            "after": after_results,
        },
        "comparison": {
            "before_tests_passed": before_results["success"],
            "after_tests_passed": after_results["success"],
            "before_total": before_results["summary"]["total"],
            "before_passed": before_results["summary"]["passed"],
            "before_failed": before_results["summary"]["failed"],
            "after_total": after_results["summary"]["total"],
            "after_passed": after_results["summary"]["passed"],
            "after_failed": after_results["summary"]["failed"],
        }
    }
    
    if args.output:
        output_path = Path(args.output)
    else:
        date_str = started_at.strftime("%Y-%m-%d")
        time_str = started_at.strftime("%H-%M-%S")
        output_path = project_root / "evaluation" / date_str / time_str / "report.json"
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n✅ Report saved to: {output_path}")
    print(f"Success: {'✅ YES' if after_results['success'] else '❌ NO'}")
    
    return 0 if after_results["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
