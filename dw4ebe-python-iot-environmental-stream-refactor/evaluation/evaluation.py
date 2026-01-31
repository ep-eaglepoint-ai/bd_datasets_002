import subprocess
import sys
import os
import re
import json
from datetime import datetime


def run_tests(repo_name):
    """Run pytest against a repository and return (passed, failed, total, test_results)."""
    env = os.environ.copy()
    env['REPO_UNDER_TEST'] = repo_name

    result = subprocess.run(
        ['pytest', 'tests/', '--tb=no', '--no-header', '-v'],
        capture_output=True,
        text=True,
        env=env
    )

    output = result.stdout + result.stderr

    # Parse individual test results
    test_results = {}
    for line in output.split('\n'):
        if '::' in line and ('PASSED' in line or 'FAILED' in line):
            # Extract test name and status
            match = re.search(r'(test_\w+)\s+(PASSED|FAILED)', line)
            if match:
                test_name = match.group(1)
                status = match.group(2)
                test_results[test_name] = status

    # Parse the summary line
    passed = 0
    failed = 0

    failed_match = re.search(r'(\d+)\s+failed', output)
    passed_match = re.search(r'(\d+)\s+passed', output)

    if failed_match:
        failed = int(failed_match.group(1))
    if passed_match:
        passed = int(passed_match.group(1))

    total = passed + failed
    return passed, failed, total, test_results


def save_report(before_results, after_results, success):
    """Save timestamped report.json to evaluation folder."""
    now = datetime.now()

    # Create timestamped directory structure: YYYY-MM-DD/HH-MM-SS/
    date_dir = now.strftime('%Y-%m-%d')
    time_dir = now.strftime('%H-%M-%S')

    eval_dir = os.path.dirname(os.path.abspath(__file__))
    report_dir = os.path.join(eval_dir, date_dir, time_dir)
    os.makedirs(report_dir, exist_ok=True)

    report = {
        "timestamp": now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        "repository_before": {
            "tests": before_results[3],
            "summary": {
                "total": before_results[2],
                "passed": before_results[0],
                "failed": before_results[1]
            }
        },
        "repository_after": {
            "tests": after_results[3],
            "summary": {
                "total": after_results[2],
                "passed": after_results[0],
                "failed": after_results[1]
            }
        },
        "success": success
    }

    report_path = os.path.join(report_dir, 'report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    return report_path


def main():
    print("=" * 60)
    print("EVALUATION REPORT")
    print("=" * 60)

    # Test repository_before
    print("\n[repository_before]")
    before_passed, before_failed, before_total, before_tests = run_tests('repository_before')
    print(f"  Total: {before_total}, Passed: {before_passed}, Failed: {before_failed}")

    # Test repository_after
    print("\n[repository_after]")
    after_passed, after_failed, after_total, after_tests = run_tests('repository_after')
    print(f"  Total: {after_total}, Passed: {after_passed}, Failed: {after_failed}")

    # Determine success
    success = before_failed > 0 and after_failed == 0 and after_passed == after_total

    # Save report
    before_results = (before_passed, before_failed, before_total, before_tests)
    after_results = (after_passed, after_failed, after_total, after_tests)
    report_path = save_report(before_results, after_results, success)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    if success:
        print(f"  PASS: {before_failed} tests fixed in repository_after")
        print(f"  All {after_passed} tests now passing")
    elif after_failed > 0:
        print(f"  FAIL: {after_failed} tests still failing in repository_after")
    else:
        print(f"  Result: {after_passed} tests passing")

    print(f"\n  Report saved to: {report_path}")

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
