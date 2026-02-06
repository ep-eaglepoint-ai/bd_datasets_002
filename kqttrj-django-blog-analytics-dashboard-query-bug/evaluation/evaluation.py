import subprocess
import json
import os
import re
from datetime import datetime, timezone


def parse_test_name(raw_name):
    """Extract readable test name from pytest verbose output.
    e.g. 'tests/test_analytics.py::TestClass::test_method' -> 'TestClass test_method'
    """
    if '::' in raw_name:
        parts = raw_name.split('::')
        parts = [p for p in parts if not p.endswith('.py')]
        name = ' '.join(parts)
        name = name.replace('_', ' ')
        return name
    return raw_name


def run_tests(repo_name):
    """Run pytest against a specific repository and parse results."""
    env = os.environ.copy()
    env['REPO'] = repo_name
    env['DJANGO_SETTINGS_MODULE'] = 'settings'
    env['PYTHONPATH'] = '/app'
    env['EVALUATION_MODE'] = '1'

    result = subprocess.run(
        ['python', '-m', 'pytest', 'tests/', '-v', '--tb=short',
         '-o', 'addopts='],
        capture_output=True,
        text=True,
        env=env,
        cwd='/app'
    )

    output = result.stdout + result.stderr
    tests = {}
    for line in output.splitlines():
        if '::' in line:
            if ' PASSED' in line:
                raw_name = line.split(' PASSED')[0].strip()
                tests[parse_test_name(raw_name)] = 'PASSED'
            elif ' FAILED' in line:
                raw_name = line.split(' FAILED')[0].strip()
                tests[parse_test_name(raw_name)] = 'FAILED'

    passed = sum(1 for v in tests.values() if v == 'PASSED')
    failed = sum(1 for v in tests.values() if v == 'FAILED')

    # Fallback: parse summary line and use test names from conftest custom output
    if not tests:
        match = re.search(r'(\d+) passed', output)
        passed = int(match.group(1)) if match else 0
        match = re.search(r'(\d+) failed', output)
        failed = int(match.group(1)) if match else 0


    return {
        'tests': tests,
        'metrics': {
            'total': passed + failed,
            'passed': passed,
            'failed': failed
        },
        'error': None if result.returncode in (0, 1) else result.stderr[:500]
    }


def generate_report(before_results, after_results, output_path):
    """Generate evaluation report as JSON."""
    before_tests = before_results['tests']
    after_tests = after_results['tests']

    all_test_names = set(list(before_tests.keys()) + list(after_tests.keys()))

    tests_fixed = []
    tests_broken = []
    for name in sorted(all_test_names):
        before_status = before_tests.get(name, 'MISSING')
        after_status = after_tests.get(name, 'MISSING')
        if before_status == 'FAILED' and after_status == 'PASSED':
            tests_fixed.append(name)
        elif before_status == 'PASSED' and after_status == 'FAILED':
            tests_broken.append(name)

    total = after_results['metrics']['total']
    improvement = (len(tests_fixed) / total * 100) if total > 0 else 0

    report = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'before': {
            'tests': before_tests,
            'metrics': before_results['metrics'],
            'error': before_results['error']
        },
        'after': {
            'tests': after_tests,
            'metrics': after_results['metrics'],
            'error': after_results['error']
        },
        'comparison': {
            'tests_fixed': tests_fixed,
            'tests_broken': tests_broken,
            'improvement': round(improvement, 2)
        },
        'success': after_results['metrics']['failed'] == 0 and after_results['metrics']['passed'] > 0,
        'error': None
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)

    return report


def main():
    print("=" * 60)
    print("Running evaluation for KQTTRJ")
    print("=" * 60)

    print("\n--- Testing repository_before ---")
    before_results = run_tests('repository_before')
    print(f"Before: {before_results['metrics']['passed']} passed, "
          f"{before_results['metrics']['failed']} failed")

    print("\n--- Testing repository_after ---")
    after_results = run_tests('repository_after')
    print(f"After: {after_results['metrics']['passed']} passed, "
          f"{after_results['metrics']['failed']} failed")

    now = datetime.now(timezone.utc)
    date_str = now.strftime('%Y-%m-%d')
    time_str = now.strftime('%H-%M-%S')
    output_path = f'evaluation/{date_str}/{time_str}/report.json'

    report = generate_report(before_results, after_results, output_path)

    print(f"\n--- Results ---")
    print(f"Report saved to: {output_path}")
    print(f"Tests fixed: {len(report['comparison']['tests_fixed'])}")
    print(f"Tests broken: {len(report['comparison']['tests_broken'])}")
    print(f"Improvement: {report['comparison']['improvement']}%")
    print(f"Success: {report['success']}")

    if not report['success']:
        print("EVALUATION FAILED: repository_after has failing tests")
        exit(1)
    else:
        print("EVALUATION PASSED: all tests pass on repository_after")


if __name__ == "__main__":
    main()
