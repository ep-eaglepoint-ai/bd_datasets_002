#!/usr/bin/env python3
"""
Evaluation script for Async Resilient Chunked AI Analysis.
Runs tests on repository_before and repository_after and generates comparison reports.
"""

import subprocess
import json
import os
import sys
import re
from datetime import datetime


def run_tests(repo_path: str, repo_name: str) -> dict:
    """Run pytest on a repository and return results."""
    results = {
        "passed": 0,
        "failed": 0,
        "total": 0,
        "tests": {},
        "error": None
    }

    impl_path = os.path.join(repo_path, "main.py")
    if not os.path.exists(impl_path):
        results["error"] = "No implementation found"
        return results

    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        tests_path = os.path.join(project_root, "tests")

        env = os.environ.copy()
        env["REPO"] = repo_name
        env["PYTHONPATH"] = repo_path
        env["EVALUATION_MODE"] = "1"

        result = subprocess.run(
            [
                sys.executable, "-m", "pytest",
                tests_path,
                "-v",
                "--tb=no",
                "--no-header",
                "-p", "no:warnings",
                "-o", "addopts="
            ],
            capture_output=True,
            text=True,
            env=env,
            cwd=project_root,
            timeout=300
        )

        output = result.stdout + result.stderr

        for line in output.split('\n'):
            line = line.strip()
            if '::' in line and (' PASSED' in line or ' FAILED' in line or ' ERROR' in line):
                if ' PASSED' in line:
                    test_name = line.split(' PASSED')[0].strip()
                    if '::' in test_name:
                        test_name = test_name.split('::')[-1]
                    results["tests"][test_name] = "PASSED"
                    results["passed"] += 1
                    results["total"] += 1
                elif ' FAILED' in line:
                    test_name = line.split(' FAILED')[0].strip()
                    if '::' in test_name:
                        test_name = test_name.split('::')[-1]
                    results["tests"][test_name] = "FAILED"
                    results["failed"] += 1
                    results["total"] += 1
                elif ' ERROR' in line:
                    test_name = line.split(' ERROR')[0].strip()
                    if '::' in test_name:
                        test_name = test_name.split('::')[-1]
                    results["tests"][test_name] = "FAILED"
                    results["failed"] += 1
                    results["total"] += 1

        if results["total"] == 0:
            for line in output.split('\n'):
                passed_match = re.search(r'(\d+)\s+passed', line)
                failed_match = re.search(r'(\d+)\s+failed', line)
                if passed_match:
                    results["passed"] = int(passed_match.group(1))
                    results["total"] += results["passed"]
                if failed_match:
                    results["failed"] = int(failed_match.group(1))
                    results["total"] += results["failed"]
                if results["total"] > 0:
                    break

    except subprocess.TimeoutExpired:
        results["error"] = "Test execution timed out"
    except Exception as e:
        results["error"] = f"Test execution failed: {str(e)}"

    return results


def generate_report(before_results: dict, after_results: dict, output_path: str) -> dict:
    """Generate comparison report."""
    report = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "before": {
            "tests": before_results["tests"],
            "metrics": {
                "total": before_results["total"],
                "passed": before_results["passed"],
                "failed": before_results["failed"]
            },
            "error": before_results["error"]
        },
        "after": {
            "tests": after_results["tests"],
            "metrics": {
                "total": after_results["total"],
                "passed": after_results["passed"],
                "failed": after_results["failed"]
            },
            "error": after_results["error"]
        },
        "comparison": {
            "tests_fixed": [],
            "tests_broken": [],
            "improvement": 0
        },
        "success": False,
        "error": None
    }

    all_tests = set(list(before_results["tests"].keys()) + list(after_results["tests"].keys()))

    for test in all_tests:
        before_status = before_results["tests"].get(test, "FAILED")
        after_status = after_results["tests"].get(test, "FAILED")

        if before_status == "FAILED" and after_status == "PASSED":
            report["comparison"]["tests_fixed"].append(test)
        elif before_status == "PASSED" and after_status == "FAILED":
            report["comparison"]["tests_broken"].append(test)

    if after_results["total"] > 0:
        before_rate = (before_results["passed"] / max(before_results["total"], 1)) * 100
        after_rate = (after_results["passed"] / after_results["total"]) * 100
        report["comparison"]["improvement"] = round(after_rate - before_rate, 2)

    report["success"] = after_results["failed"] == 0 and after_results["total"] > 0

    output_dir = os.path.dirname(output_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)

    return report


def main():
    print("=" * 60)
    print("Async Resilient Chunked AI Analysis - Evaluation")
    print("=" * 60)

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repo_before = os.path.join(project_root, "repository_before")
    repo_after = os.path.join(project_root, "repository_after")

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    output_dir = os.path.join(project_root, "evaluation", date_str, time_str)
    output_file = os.path.join(output_dir, "report.json")

    print(f"\n\U0001F4C2 Project Root: {project_root}")
    print(f"\U0001F4C4 Output: {output_file}\n")

    print("\U0001F50D Evaluating repository_before...")
    before_results = run_tests(repo_before, "repository_before")
    print(f"   \u2713 Passed: {before_results['passed']}")
    print(f"   \u2717 Failed: {before_results['failed']}")
    if before_results["error"]:
        print(f"   \u26A0 Error: {before_results['error']}")

    print("\n\U0001F50D Evaluating repository_after...")
    after_results = run_tests(repo_after, "repository_after")
    print(f"   \u2713 Passed: {after_results['passed']}")
    print(f"   \u2717 Failed: {after_results['failed']}")
    if after_results["error"]:
        print(f"   \u26A0 Error: {after_results['error']}")

    report = generate_report(before_results, after_results, output_file)

    print(f"\n{'=' * 60}")
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Tests Fixed: {len(report['comparison']['tests_fixed'])}")
    for test in report["comparison"]["tests_fixed"]:
        print(f"  \u2713 {test}")

    print(f"\nTests Broken: {len(report['comparison']['tests_broken'])}")
    for test in report["comparison"]["tests_broken"]:
        print(f"  \u2717 {test}")

    print(f"\nImprovement: {report['comparison']['improvement']}%")
    success_str = "\u2713 PASS" if report["success"] else "\u2717 FAIL"
    print(f"Overall Success: {success_str}")
    print("=" * 60)

    sys.exit(0 if report["success"] else 1)


if __name__ == "__main__":
    main()
