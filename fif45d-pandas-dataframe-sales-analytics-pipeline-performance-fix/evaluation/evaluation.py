#!/usr/bin/env python3
"""
Evaluation system for FIF45D task.

Runs test-before and test-after, captures results, and generates JSON reports.
"""

import json
import os
import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path

def run_command(cmd, cwd=None, env=None):
    """Run a command and capture output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            cwd=cwd,
            env=env,
            timeout=300  # 5 minute timeout
        )
        return {
            'success': result.returncode == 0,
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': 'Command timed out after 300 seconds'
        }
    except Exception as e:
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': str(e)
        }


def check_repository_before_exists():
    """Check if repository_before is runnable"""
    before_path = Path('repository_before/process_sales.py')
    return before_path.exists() and before_path.stat().st_size > 0


def run_tests_before():
    """Run tests against repository_before"""
    if not check_repository_before_exists():
        return {
            'executed': False,
            'tests_passed': False,
            'failed_tests': [],
            'errors': ['repository_before/process_sales.py not found or empty']
        }
    
    # Set TEST_MODE environment variable to use before implementation
    env = os.environ.copy()
    env['TEST_MODE'] = 'before'
    cmd = 'python -m pytest tests/ -v --tb=short -x'
    
    start_time = time.time()
    result = run_command(cmd, env=env)
    elapsed_ms = int((time.time() - start_time) * 1000)
    
    if not result['success']:
        # Parse pytest output to extract failed tests
        failed_tests = []
        errors = []
        
        lines = result['stdout'].split('\n') + result['stderr'].split('\n')
        for line in lines:
            if 'FAILED' in line or 'ERROR' in line:
                # Try to extract test name
                if '::' in line:
                    test_name = line.split('::')[-1].strip()
                    if test_name:
                        failed_tests.append(test_name)
                errors.append(line.strip())
        
        return {
            'executed': True,
            'tests_passed': False,
            'failed_tests': failed_tests if failed_tests else ['Unknown test failures'],
            'errors': errors[:10],  # Limit to first 10 errors
            'execution_time_ms': elapsed_ms
        }
    else:
        # Parse passed tests
        passed_tests = []
        lines = result['stdout'].split('\n')
        for line in lines:
            if 'PASSED' in line and '::' in line:
                test_name = line.split('::')[-1].strip()
                if test_name:
                    passed_tests.append(test_name)
        
        return {
            'executed': True,
            'tests_passed': True,
            'passed_tests': passed_tests,
            'failed_tests': [],
            'errors': [],
            'execution_time_ms': elapsed_ms
        }


def run_tests_after():
    """Run tests against repository_after"""
    # Set TEST_MODE environment variable to use after implementation (default)
    env = os.environ.copy()
    env['TEST_MODE'] = 'after'
    cmd = 'python -m pytest tests/ -v --tb=short'
    
    start_time = time.time()
    result = run_command(cmd, env=env)
    elapsed_ms = int((time.time() - start_time) * 1000)
    
    if not result['success']:
        failed_tests = []
        errors = []
        
        lines = result['stdout'].split('\n') + result['stderr'].split('\n')
        for line in lines:
            if 'FAILED' in line or 'ERROR' in line:
                if '::' in line:
                    test_name = line.split('::')[-1].strip()
                    if test_name:
                        failed_tests.append(test_name)
                errors.append(line.strip())
        
        return {
            'tests_passed': False,
            'failed_tests': failed_tests if failed_tests else ['Unknown test failures'],
            'errors': errors[:10],
            'execution_time_ms': elapsed_ms
        }
    else:
        passed_tests = []
        lines = result['stdout'].split('\n')
        for line in lines:
            if 'PASSED' in line and '::' in line:
                test_name = line.split('::')[-1].strip()
                if test_name:
                    passed_tests.append(test_name)
        
        return {
            'tests_passed': True,
            'passed_tests': passed_tests,
            'failed_tests': [],
            'errors': [],
            'execution_time_ms': elapsed_ms
        }


def generate_report(before_result, after_result):
    """Generate comparison report"""
    comparison = {
        'fail_to_pass': [],
        'pass_to_pass': []
    }
    
    if before_result.get('executed', False):
        before_failed = set(before_result.get('failed_tests', []))
        after_passed = set(after_result.get('passed_tests', []))
        
        # Tests that failed before but pass after
        comparison['fail_to_pass'] = list(before_failed.intersection(after_passed))
        
        # Tests that passed both times
        before_passed = set(before_result.get('passed_tests', []))
        comparison['pass_to_pass'] = list(before_passed.intersection(after_passed))
    
    report = {
        'before': before_result,
        'after': after_result,
        'comparison': comparison,
        'timestamp': datetime.now().isoformat()
    }
    
    return report


def save_report(report, output_dir):
    """Save report to JSON files"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save to latest.json
    latest_path = output_dir / 'latest.json'
    with open(latest_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Save to report.json
    report_path = output_dir / 'report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Save to dated directory
    date_str = datetime.now().strftime('%Y-%m-%d')
    timestamp_str = datetime.now().strftime('%H%M%S')
    dated_dir = output_dir / date_str / timestamp_str
    dated_dir.mkdir(parents=True, exist_ok=True)
    
    dated_report_path = dated_dir / 'report.json'
    with open(dated_report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return latest_path, report_path, dated_report_path


def main():
    """Main evaluation function"""
    print("=" * 80)
    print("FIF45D Evaluation System")
    print("=" * 80)
    print()
    
    # Create reports directory
    reports_dir = Path('evaluation/reports')
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    # Run tests against repository_before
    print("Running tests against repository_before...")
    before_result = run_tests_before()
    print(f"  Executed: {before_result.get('executed', False)}")
    if before_result.get('executed', False):
        print(f"  Tests passed: {before_result.get('tests_passed', False)}")
        print(f"  Execution time: {before_result.get('execution_time_ms', 0)} ms")
    print()
    
    # Run tests against repository_after
    print("Running tests against repository_after...")
    after_result = run_tests_after()
    print(f"  Tests passed: {after_result.get('tests_passed', False)}")
    print(f"  Execution time: {after_result.get('execution_time_ms', 0)} ms")
    print()
    
    # Generate report
    print("Generating report...")
    report = generate_report(before_result, after_result)
    
    # Save reports
    latest_path, report_path, dated_path = save_report(report, reports_dir)
    print(f"  Saved to: {latest_path}")
    print(f"  Saved to: {report_path}")
    print(f"  Saved to: {dated_path}")
    print()
    
    # Print summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Before: {'Executed' if before_result.get('executed', False) else 'Skipped'}")
    if before_result.get('executed', False):
        print(f"  Tests passed: {before_result.get('tests_passed', False)}")
    print(f"After: Tests passed: {after_result.get('tests_passed', False)}")
    print(f"Fail to pass: {len(report['comparison']['fail_to_pass'])}")
    print(f"Pass to pass: {len(report['comparison']['pass_to_pass'])}")
    print("=" * 80)
    
    # Exit with appropriate code
    if after_result.get('tests_passed', False):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
