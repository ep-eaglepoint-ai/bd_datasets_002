#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime

def load_test_results(filename):
    with open(filename, 'r') as f:
        return json.load(f)

def run_tests(test_file):
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            cwd="/app",
            stdout=sys.stdout,
            stderr=sys.stderr,
            timeout=120
        )
        return result.returncode
    except subprocess.TimeoutExpired:
        return -1
    except Exception as e:
        print(f"Error running tests: {e}")
        return -1

def find_fail_to_pass_tests(before, after):
    before_map = {test["name"]: test["passed"] for test in before["tests"]}
    after_map = {test["name"]: test["passed"] for test in after["tests"]}
    
    fail_to_pass = []
    for test_name, before_passed in before_map.items():
        after_passed = after_map.get(test_name)
        if after_passed is not None and not before_passed and after_passed:
            fail_to_pass.append(test_name)
    
    return fail_to_pass

def generate_report(before_file, after_file):
    started_at = datetime.now()
    
    # Run test-before
    print("Running test-before...")
    return_code = run_tests("tests/test_before.py")
    if return_code != 0 and return_code != 1:  # 1 is expected for test failures
        print(f"Warning: test-before execution error: return code {return_code}")
    
    # Run test-after
    print("Running test-after...")
    return_code = run_tests("tests/test_after.py")
    if return_code != 0 and return_code != 1:  # 1 is expected for test failures
        print(f"Warning: test-after execution error: return code {return_code}")
    
    # Load results
    try:
        before_results = load_test_results(before_file)
    except Exception as e:
        return None, f"failed to load before results: {e}"
    
    try:
        after_results = load_test_results(after_file)
    except Exception as e:
        return None, f"failed to load after results: {e}"
    
    fail_to_pass = find_fail_to_pass_tests(before_results, after_results)
    finished_at = datetime.now()
    duration = (finished_at - started_at).total_seconds()
    
    passed_gate = after_results["success"]
    improvement_summary = "After implementation passed correctness tests"
    if not passed_gate:
        improvement_summary = "After implementation failed correctness tests"
    
    report = {
        "run_id": f"run_{int(started_at.timestamp())}",
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": duration,
        "before": {
            "tests_passed": before_results["success"],
            "violations_detected": not before_results["success"],
            "tests": {
                "passed": before_results["passed"],
                "failed": before_results["failed"],
                "total": before_results["total"],
                "success": before_results["success"]
            }
        },
        "after": {
            "tests_passed": after_results["success"],
            "throughput_verified": after_results["success"],
            "timeouts_verified": after_results["success"],
            "concurrency_verified": after_results["success"],
            "tests": {
                "passed": after_results["passed"],
                "failed": after_results["failed"],
                "total": after_results["total"],
                "success": after_results["success"]
            }
        },
        "comparison": {
            "fail_to_pass": fail_to_pass,
            "tests_fixed": len(fail_to_pass),
            "passed_gate": passed_gate,
            "improvement_summary": improvement_summary
        },
        "success": passed_gate,
        "error": None
    }
    
    return report, None

def main():
    base_dir = "/app"
    if len(sys.argv) > 1:
        base_dir = sys.argv[1]
    
    before_file = os.path.join(base_dir, "tests", "test_before_results.json")
    after_file = os.path.join(base_dir, "tests", "test_after_results.json")
    
    report, error = generate_report(before_file, after_file)
    if error:
        report = {
            "run_id": f"run_{int(time.time())}",
            "started_at": datetime.now().isoformat(),
            "finished_at": datetime.now().isoformat(),
            "duration_seconds": 0,
            "success": False,
            "error": error
        }
    
    reports_dir = os.path.join(base_dir, "evaluation", "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    report_file = os.path.join(reports_dir, "latest.json")
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"Report written to {report_file}")
    if report["success"]:
        print("Evaluation succeeded")
    else:
        print("Evaluation failed")
    
    if report.get("error"):
        sys.exit(1)
    if not report["success"]:
        sys.exit(1)
    
    sys.exit(0)

if __name__ == "__main__":
    main()
