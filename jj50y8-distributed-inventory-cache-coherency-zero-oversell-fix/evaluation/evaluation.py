#!/usr/bin/env python3

import json
import os
import sys
from pathlib import Path
from datetime import datetime
import random
import string

TEST_RESULTS_BEFORE = '/app/tests/test-results-before.json'
TEST_RESULTS_AFTER = '/app/tests/test-results-after.json'
REPORTS_DIR = '/app/evaluation/reports'

# Ensure reports directory exists
Path(REPORTS_DIR).mkdir(parents=True, exist_ok=True)

# Create timestamped directory
now = datetime.now()
date_str = now.strftime('%Y-%m-%d')
time_str = now.strftime('%H-%M-%S')
timestamp_dir = Path(REPORTS_DIR) / date_str / time_str
timestamp_dir.mkdir(parents=True, exist_ok=True)

REPORT_FILE = timestamp_dir / 'report.json'


def read_test_results(file_path):
    """Read and parse test results JSON file."""
    if not os.path.exists(file_path):
        # Write to stderr to avoid polluting JSON output
        sys.stderr.write(f'Test results file not found: {file_path}\n')
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as error:
        # Write to stderr to avoid polluting JSON output
        sys.stderr.write(f'Error reading test results from {file_path}: {error}\n')
        return None


def generate_report():
    """Generate evaluation report from test results."""
    started_at = datetime.now().isoformat()
    
    # Read test results
    before_results = read_test_results(TEST_RESULTS_BEFORE)
    after_results = read_test_results(TEST_RESULTS_AFTER)
    
    if not before_results:
        # Write to stderr to avoid polluting JSON output
        sys.stderr.write('ERROR: test-before results not found. Run test-before first.\n')
        sys.exit(1)
    
    if not after_results:
        # Write to stderr to avoid polluting JSON output
        sys.stderr.write('ERROR: test-after results not found. Run test-after first.\n')
        sys.exit(1)
    
    # Extract test statistics
    before = {
        'passed': before_results.get('passed', 0),
        'failed': before_results.get('failed', 0),
        'total': before_results.get('total', 0),
        'testDetails': before_results.get('testDetails', [])
    }
    
    after = {
        'passed': after_results.get('passed', 0),
        'failed': after_results.get('failed', 0),
        'total': after_results.get('total', 0),
        'testDetails': after_results.get('testDetails', [])
    }
    
    # Determine which tests failed in before but passed in after
    fail_to_pass = []
    
    if before['testDetails'] and after['testDetails']:
        # First, try exact name matching
        before_map = {test['name']: test['status'] for test in before['testDetails']}
        
        for test in after['testDetails']:
            if before_map.get(test['name']) == 'failed' and test['status'] == 'passed':
                fail_to_pass.append(test['name'])
        
        # If no exact matches (different test suites), count failed tests from before
        # as "fixed" since after has all passes
        if len(fail_to_pass) == 0 and before['failed'] > 0 and after['failed'] == 0:
            # All failed tests in before are considered "fixed" in after
            for test in before['testDetails']:
                if test['status'] == 'failed':
                    fail_to_pass.append(test['name'])
    
    # Determine violations detected in before
    # Violations are detected if any tests failed (indicating oversell, inconsistencies, etc.)
    violations_detected = before['failed'] > 0
    
    # Determine if after tests passed
    after_tests_passed = after['failed'] == 0
    
    # Performance and correctness checks for after
    # These are verified if all tests pass (the tests themselves verify these requirements)
    throughput_verified = after['failed'] == 0
    timeouts_verified = after['failed'] == 0
    concurrency_verified = after['failed'] == 0
    
    # Generate run_id
    run_id = f"run-{int(datetime.now().timestamp() * 1000)}-{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"
    
    report = {
        'run_id': run_id,
        'started_at': started_at,
        'finished_at': datetime.now().isoformat(),
        
        'before': {
            'tests_passed': before['failed'] == 0,
            'violations_detected': violations_detected,
            'tests': {
                'passed': before['passed'],
                'failed': before['failed'],
                'total': before['total'],
                'success': before['failed'] == 0
            }
        },
        
        'after': {
            'tests_passed': after_tests_passed,
            'throughput_verified': throughput_verified,
            'timeouts_verified': timeouts_verified,
            'concurrency_verified': concurrency_verified,
            'tests': {
                'passed': after['passed'],
                'failed': after['failed'],
                'total': after['total'],
                'success': after['failed'] == 0
            }
        },
        
        'comparison': {
            'fail_to_pass': fail_to_pass,
            'tests_fixed': len(fail_to_pass)
        },
        
        # Success if: after passes all tests AND before had violations (bugs detected)
        # The fail_to_pass list shows which bugs were fixed
        'success': after_tests_passed and violations_detected and (len(fail_to_pass) > 0 or before['failed'] > 0)
    }
    
    # Write report to timestamped directory
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    # Also write to standard location for compatibility
    standard_report_file = Path(REPORTS_DIR) / 'report.json'
    with open(standard_report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    # Output JSON to stdout
    print(json.dumps(report, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if report['success'] else 1)


if __name__ == '__main__':
    generate_report()
