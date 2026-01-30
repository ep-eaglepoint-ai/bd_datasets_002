"""
Evaluation script for User Activity Aggregation optimization.
Runs pytest for both before and after repositories and generates a timestamped report.json.
"""

import subprocess
import json
import re
import sys
import os
from datetime import datetime
from pathlib import Path


def run_tests(project_root: Path, target: str) -> tuple:
    """Run tests for a specific target (before/after)."""
    env = os.environ.copy()
    env['TEST_TARGET'] = target
    env['EVALUATION_MODE'] = '1'

    output = ''
    error = None

    try:
        result = subprocess.run(
            ['python', '-m', 'pytest', 'tests/', '-v', '--tb=no'],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=300,
            env=env
        )
        output = result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        error = 'Tests timed out'
    except Exception as e:
        error = str(e)

    return output, error


def parse_pytest_output(output: str) -> dict:
    """Parse pytest output to extract test results."""
    tests = {}

    for line in output.split('\n'):
        # Match: tests/test_file.py::TestClass::test_name PASSED/FAILED
        passed_match = re.search(r'::([^:]+)::([^:\s]+)\s+PASSED', line)
        if passed_match:
            test_name = f'{passed_match.group(1)} {passed_match.group(2)}'
            tests[test_name] = 'PASSED'
            continue

        failed_match = re.search(r'::([^:]+)::([^:\s]+)\s+FAILED', line)
        if failed_match:
            test_name = f'{failed_match.group(1)} {failed_match.group(2)}'
            tests[test_name] = 'FAILED'

    return tests


def count_results(output: str) -> tuple:
    """Extract pass/fail counts from pytest output."""
    summary_match = re.search(r'(\d+)\s+passed', output)
    failed_match = re.search(r'(\d+)\s+failed', output)

    passed = int(summary_match.group(1)) if summary_match else 0
    failed = int(failed_match.group(1)) if failed_match else 0

    return passed, failed


def compare_results(before_tests: dict, after_tests: dict) -> dict:
    """Compare before and after test results."""
    tests_fixed = []
    tests_broken = []

    all_tests = set(before_tests.keys()) | set(after_tests.keys())

    for test in all_tests:
        before_status = before_tests.get(test, 'MISSING')
        after_status = after_tests.get(test, 'MISSING')

        if before_status == 'FAILED' and after_status == 'PASSED':
            tests_fixed.append(test)
        elif before_status == 'PASSED' and after_status == 'FAILED':
            tests_broken.append(test)

    before_failed = sum(1 for s in before_tests.values() if s == 'FAILED')
    after_failed = sum(1 for s in after_tests.values() if s == 'FAILED')

    if before_failed > 0:
        improvement = ((before_failed - after_failed) / before_failed) * 100
    else:
        improvement = 0.0 if after_failed == 0 else -100.0

    return {
        'tests_fixed': sorted(tests_fixed),
        'tests_broken': sorted(tests_broken),
        'improvement': round(improvement, 2)
    }


def main():
    print('=' * 60)
    print('User Activity Aggregation - Evaluation')
    print('=' * 60)
    print()

    project_root = Path(__file__).parent.parent

    # Test repository_before
    print('Evaluating repository_before...')
    before_output, before_error = run_tests(project_root, 'before')
    before_tests = parse_pytest_output(before_output)
    before_passed, before_failed = count_results(before_output)
    before_total = before_passed + before_failed
    print(f'  Passed: {before_passed}')
    print(f'  Failed: {before_failed}')
    print()

    # Test repository_after
    print('Evaluating repository_after...')
    after_output, after_error = run_tests(project_root, 'after')
    after_tests = parse_pytest_output(after_output)
    after_passed, after_failed = count_results(after_output)
    after_total = after_passed + after_failed
    print(f'  Passed: {after_passed}')
    print(f'  Failed: {after_failed}')

    # Compare results
    comparison = compare_results(before_tests, after_tests)

    # Generate timestamped output directory
    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')
    time_str = now.strftime('%H-%M-%S')
    output_dir = Path(__file__).parent / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)

    report = {
        'timestamp': now.isoformat(),
        'before': {
            'tests': before_tests,
            'metrics': {
                'total': before_total,
                'passed': before_passed,
                'failed': before_failed
            },
            'error': before_error
        },
        'after': {
            'tests': after_tests,
            'metrics': {
                'total': after_total,
                'passed': after_passed,
                'failed': after_failed
            },
            'error': after_error
        },
        'comparison': comparison,
        'success': after_failed == 0 and after_total > 0,
        'error': None
    }

    report_path = output_dir / 'report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    print()
    print('=' * 60)
    print('EVALUATION SUMMARY')
    print('=' * 60)
    print(f'Before: Total: {before_total} | Passed: {before_passed} | Failed: {before_failed}')
    print(f'After:  Total: {after_total} | Passed: {after_passed} | Failed: {after_failed}')
    print(f'Tests Fixed: {len(comparison["tests_fixed"])}')
    print(f'Tests Broken: {len(comparison["tests_broken"])}')
    print(f'Improvement: {comparison["improvement"]}%')
    print(f'Overall: {"PASS" if report["success"] else "FAIL"}')
    print('=' * 60)
    print(f'\nReport saved to: {report_path}')

    sys.exit(0)


if __name__ == '__main__':
    main()
