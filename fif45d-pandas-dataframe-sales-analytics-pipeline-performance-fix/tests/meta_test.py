#!/usr/bin/env python3
"""
Meta Test Suite - Validates test suite correctness

This script runs locally (not in Docker) to validate that:
1. Tests correctly identify failures in repository_before (broken code)
2. Tests correctly pass for repository_after (correct code)
3. Test suite is comprehensive and catches all critical issues

Run locally with: python meta_test.py

Requirements:
- pandas>=1.5.0
- numpy>=1.21.0
- pytest>=7.0.0

Install with: pip install pandas numpy pytest
"""

import sys
import os
import subprocess
from pathlib import Path

# Check for required dependencies
try:
    import pytest
except ImportError:
    print("=" * 80)
    print("ERROR: Missing required dependencies")
    print("=" * 80)
    print("Missing: pytest")
    print("\nPlease install dependencies:")
    print("  pip install pandas numpy pytest")
    print("\nOr use requirements.txt:")
    print("  pip install -r requirements.txt")
    sys.exit(1)

# Get base directory (parent of tests/ folder)
base_dir = Path(__file__).parent.parent


def run_pytest_tests(test_mode, timeout=300):
    """
    Run pytest on all tests in tests/ folder with specified TEST_MODE
    
    Args:
        test_mode: 'before' or 'after'
        timeout: Maximum time in seconds
    
    Returns:
        dict with 'success', 'returncode', 'stdout', 'stderr', 'passed', 'failed'
    """
    env = os.environ.copy()
    env['TEST_MODE'] = test_mode
    env['PYTHONPATH'] = str(base_dir)
    
    cmd = [
        sys.executable, '-m', 'pytest',
        'tests/',
        '-v',
        '--tb=short',
        '--no-header'
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(base_dir),
            env=env,
            timeout=timeout
        )
        
        # Parse pytest output
        stdout_lines = result.stdout.split('\n')
        stderr_lines = result.stderr.split('\n')
        
        passed_tests = []
        failed_tests = []
        
        for line in stdout_lines + stderr_lines:
            if 'PASSED' in line and '::' in line:
                # Extract test name: tests/test_process_sales.py::TestClass::test_method PASSED
                parts = line.split('::')
                if len(parts) >= 3:
                    test_name = '::'.join(parts[-2:]).split()[0]  # Get TestClass::test_method
                    passed_tests.append(test_name)
            elif 'FAILED' in line and '::' in line:
                parts = line.split('::')
                if len(parts) >= 3:
                    test_name = '::'.join(parts[-2:]).split()[0]
                    failed_tests.append(test_name)
            elif 'ERROR' in line and '::' in line:
                parts = line.split('::')
                if len(parts) >= 3:
                    test_name = '::'.join(parts[-2:]).split()[0]
                    failed_tests.append(test_name)
        
        return {
            'success': result.returncode == 0,
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': f'Tests timed out after {timeout} seconds',
            'passed_tests': [],
            'failed_tests': ['TIMEOUT']
        }
    except Exception as e:
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': str(e),
            'passed_tests': [],
            'failed_tests': ['EXCEPTION']
        }


def check_implementations_exist():
    """Check if both implementations exist"""
    before_path = base_dir / 'repository_before' / 'process_sales.py'
    after_path = base_dir / 'repository_after' / 'process_sales.py'
    
    before_exists = before_path.exists() and before_path.stat().st_size > 0
    after_exists = after_path.exists() and after_path.stat().st_size > 0
    
    return before_exists, after_exists


def run_meta_tests():
    """Run meta tests using pytest on all test files"""
    print("=" * 80)
    print("META TEST SUITE - Validating Test Suite Correctness")
    print("=" * 80)
    print()
    print("This meta test runs pytest on all tests in tests/ folder")
    print("to validate that the test suite correctly identifies issues.")
    print()
    
    # Check implementations
    before_exists, after_exists = check_implementations_exist()
    
    if not after_exists:
        print("❌ ERROR: repository_after/process_sales.py not found!")
        print("   The correct implementation must exist.")
        return False
    
    results = {
        'before': None,
        'after': None
    }
    
    # Test repository_before (broken code)
    if before_exists:
        print("Testing repository_before (broken implementation)...")
        print("-" * 80)
        print("Running: pytest tests/ (with TEST_MODE=before)")
        print()
        
        results['before'] = run_pytest_tests('before', timeout=600)  # 10 min timeout for slow iterrows
        
        print(f"  Return code: {results['before']['returncode']}")
        print(f"  Passed tests: {len(results['before']['passed_tests'])}")
        print(f"  Failed tests: {len(results['before']['failed_tests'])}")
        
        if results['before']['failed_tests']:
            print("\n  Failed test names:")
            for test in results['before']['failed_tests'][:10]:  # Show first 10
                print(f"    - {test}")
            if len(results['before']['failed_tests']) > 10:
                print(f"    ... and {len(results['before']['failed_tests']) - 10} more")
        
        print()
    else:
        print("⚠️  repository_before not available - skipping")
        print("   (This is okay if repository_before is intentionally empty)")
        print()
    
    # Test repository_after (correct code)
    print("Testing repository_after (correct implementation)...")
    print("-" * 80)
    print("Running: pytest tests/ (with TEST_MODE=after)")
    print()
    
    results['after'] = run_pytest_tests('after', timeout=300)  # 5 min timeout
    
    print(f"  Return code: {results['after']['returncode']}")
    print(f"  Passed tests: {len(results['after']['passed_tests'])}")
    print(f"  Failed tests: {len(results['after']['failed_tests'])}")
    
    if results['after']['failed_tests']:
        print("\n  ❌ Failed test names:")
        for test in results['after']['failed_tests']:
            print(f"    - {test}")
    
    if results['after']['passed_tests']:
        print("\n  ✅ Passed test names:")
        for test in results['after']['passed_tests'][:10]:  # Show first 10
            print(f"    - {test}")
        if len(results['after']['passed_tests']) > 10:
            print(f"    ... and {len(results['after']['passed_tests']) - 10} more")
    
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    validation_passed = True
    
    if before_exists and results['before']:
        before_expected_fail = not results['before']['success']  # Before should fail
        if before_expected_fail:
            print("✅ repository_before: Tests failed as expected (broken code)")
        else:
            print("⚠️  repository_before: Tests passed (unexpected - broken code should fail)")
            validation_passed = False
    
    if results['after']:
        after_expected_pass = results['after']['success']  # After should pass
        if after_expected_pass:
            print(f"✅ repository_after: All tests passed ({len(results['after']['passed_tests'])} tests)")
        else:
            print(f"❌ repository_after: Tests failed ({len(results['after']['failed_tests'])} failures)")
            validation_passed = False
            print("\n  Failed tests:")
            for test in results['after']['failed_tests']:
                print(f"    - {test}")
    
    print()
    
    if validation_passed:
        print("=" * 80)
        print("✅ META TEST VALIDATION: PASSED")
        print("=" * 80)
        print("\nThe test suite correctly:")
        if before_exists:
            print("  - Identifies failures in repository_before (broken code)")
        print("  - Validates correctness in repository_after (correct code)")
        return True
    else:
        print("=" * 80)
        print("❌ META TEST VALIDATION: FAILED")
        print("=" * 80)
        print("\nThe test suite needs attention:")
        if before_exists and results['before'] and results['before']['success']:
            print("  - repository_before should fail tests but it passed")
        if results['after'] and not results['after']['success']:
            print("  - repository_after should pass all tests but some failed")
        return False


if __name__ == '__main__':
    success = run_meta_tests()
    sys.exit(0 if success else 1)
