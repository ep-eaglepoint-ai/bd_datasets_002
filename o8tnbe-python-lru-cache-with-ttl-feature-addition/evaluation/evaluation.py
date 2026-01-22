#!/usr/bin/env python3
"""Evaluation script for LRU Cache with TTL implementation."""

import sys
import os
import time
import threading
import json
import uuid
import platform
import subprocess
from datetime import datetime


def get_environment_info():
    """Get environment information."""
    try:
        # Try to get git info
        try:
            git_commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], 
                                               stderr=subprocess.DEVNULL).decode().strip()
            if not git_commit:
                git_commit = "unknown"
        except:
            git_commit = "unknown"
        
        try:
            git_branch = subprocess.check_output(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], 
                                               stderr=subprocess.DEVNULL).decode().strip()
            if not git_branch:
                git_branch = "unknown"
        except:
            git_branch = "unknown"
        
        return {
            "python_version": platform.python_version(),
            "platform": platform.platform(),
            "os": platform.system(),
            "os_release": platform.release(),
            "architecture": platform.machine(),
            "hostname": platform.node(),
            "git_commit": git_commit,
            "git_branch": git_branch
        }
    except Exception as e:
        return {
            "python_version": platform.python_version(),
            "platform": "unknown",
            "os": "unknown",
            "os_release": "unknown",
            "architecture": "unknown",
            "hostname": "unknown",
            "git_commit": "unknown",
            "git_branch": "unknown",
            "error": str(e)
        }


def run_pytest_tests(repo_dir):
    """Run pytest tests for a specific repository."""
    try:
        # Set up environment to use the correct repository
        env = os.environ.copy()
        if repo_dir == "repository_before":
            env['PYTHONPATH'] = '/app/repository_before'
            test_file = 'tests/test_before.py'
        else:
            env['PYTHONPATH'] = '/app/repository_after'
            test_file = 'tests/test_after.py'
        
        # Run pytest with verbose output
        cmd = [
            sys.executable, '-m', 'pytest', 
            test_file, '-v', '--tb=short'
        ]
        
        result = subprocess.run(
            cmd,
            cwd='/app',
            env=env,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        # Parse stdout for test results
        tests = []
        lines = result.stdout.split('\n')
        for line in lines:
            if '::' in line and ('PASSED' in line or 'FAILED' in line or 'ERROR' in line or 'SKIPPED' in line):
                parts = line.split()
                if len(parts) >= 2:
                    nodeid = parts[0]
                    # Skip lines that don't have proper test nodeids
                    if not nodeid.startswith('tests/'):
                        continue
                        
                    if 'PASSED' in line:
                        outcome = 'passed'
                    elif 'FAILED' in line:
                        outcome = 'failed'
                    elif 'ERROR' in line:
                        outcome = 'error'
                    elif 'SKIPPED' in line:
                        outcome = 'skipped'
                    else:
                        outcome = 'unknown'
                    
                    name = nodeid.split('::')[-1] if '::' in nodeid else nodeid
                    tests.append({
                        "nodeid": nodeid,
                        "name": name,
                        "outcome": outcome
                    })
        
        # Calculate summary
        total = len(tests)
        passed = len([t for t in tests if t['outcome'] == 'passed'])
        failed = len([t for t in tests if t['outcome'] == 'failed'])
        errors = len([t for t in tests if t['outcome'] == 'error'])
        skipped = len([t for t in tests if t['outcome'] == 'skipped'])
        xfailed = len([t for t in tests if t['outcome'] == 'xfailed'])
        
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
                "xfailed": xfailed
            },
            "stdout": result.stdout,
            "stderr": result.stderr
        }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 1, "skipped": 0, "xfailed": 0},
            "stdout": "",
            "stderr": "Test execution timed out"
        }
    except Exception as e:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 1, "skipped": 0, "xfailed": 0},
            "stdout": "",
            "stderr": f"Error running tests: {str(e)}"
        }


def generate_comparison(before_results, after_results):
    """Generate comparison between before and after results."""
    return {
        "before_tests_passed": before_results["success"],
        "after_tests_passed": after_results["success"],
        "before_total": before_results["summary"]["total"],
        "before_passed": before_results["summary"]["passed"],
        "before_failed": before_results["summary"]["failed"],
        "after_total": after_results["summary"]["total"],
        "after_passed": after_results["summary"]["passed"],
        "after_failed": after_results["summary"]["failed"]
    }


def run_evaluation():
    """Run comprehensive evaluation of both implementations."""
    run_id = str(uuid.uuid4())[:8]
    started_at = datetime.now()
    
    print("=" * 60)
    print("LRU Cache with TTL - Implementation Evaluation")
    print("=" * 60)
    print(f"Run ID: {run_id}")
    print(f"Started at: {started_at.isoformat()}")
    
    results = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": None,
        "duration_seconds": None,
        "success": True,
        "error": None,
        "environment": get_environment_info(),
        "results": {
            "before": None,
            "after": None,
            "comparison": None
        }
    }
    
    try:
        # Run before tests
        print("\n1. Running BEFORE implementation tests...")
        before_results = run_pytest_tests("repository_before")
        results["results"]["before"] = before_results
        
        # Run after tests
        print("\n2. Running AFTER implementation tests...")
        after_results = run_pytest_tests("repository_after")
        results["results"]["after"] = after_results
        
        # Generate comparison
        print("\n3. Generating comparison...")
        comparison = generate_comparison(before_results, after_results)
        results["results"]["comparison"] = comparison
        
        # Determine overall success
        # Success means: before tests should fail (showing missing functionality)
        # and after tests should pass (showing implemented functionality)
        results["success"] = after_results["success"] and not before_results["success"]
        
    except Exception as e:
        results["success"] = False
        results["error"] = str(e)
        print(f"\nError during evaluation: {e}")
    
    finally:
        finished_at = datetime.now()
        results["finished_at"] = finished_at.isoformat()
        results["duration_seconds"] = (finished_at - started_at).total_seconds()
    
    # Print summary
    print_summary(results)
    
    # Save results
    save_results(results)
    
    return results


def print_summary(results):
    """Print evaluation summary."""
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    
    print(f"\nRun ID: {results['run_id']}")
    print(f"Duration: {results['duration_seconds']:.2f} seconds")
    print(f"Overall Success: {'✓' if results['success'] else '✗'}")
    
    if results['error']:
        print(f"Error: {results['error']}")
    
    # Before implementation
    before = results["results"]["before"]
    if before:
        print(f"\nBEFORE Implementation:")
        print(f"  - Success: {'✓' if before['success'] else '✗'}")
        print(f"  - Tests: {before['summary']['passed']}/{before['summary']['total']} passed")
        if before['summary']['failed'] > 0:
            print(f"  - Failed: {before['summary']['failed']}")
    
    # After implementation
    after = results["results"]["after"]
    if after:
        print(f"\nAFTER Implementation:")
        print(f"  - Success: {'✓' if after['success'] else '✗'}")
        print(f"  - Tests: {after['summary']['passed']}/{after['summary']['total']} passed")
        if after['summary']['failed'] > 0:
            print(f"  - Failed: {after['summary']['failed']}")
    
    # Comparison
    comparison = results["results"]["comparison"]
    if comparison:
        print(f"\nCOMPARISON:")
        print(f"  - Before → After: {comparison['before_passed']}/{comparison['before_total']} → {comparison['after_passed']}/{comparison['after_total']}")
        improvement = comparison['after_passed'] - comparison['before_passed']
        if improvement > 0:
            print(f"  - Improvement: +{improvement} tests passing")
    
    if results['success']:
        print("\n✓ EVALUATION PASSED")
    else:
        print("\n✗ EVALUATION FAILED")


def save_results(results):
    """Save evaluation results to file."""
    # Create timestamped directory structure
    now = datetime.now()
    date_dir = now.strftime("%Y-%m-%d")
    time_dir = now.strftime("%H-%M-%S")
    
    reports_dir = os.path.join(os.path.dirname(__file__), 'reports', date_dir, time_dir)
    os.makedirs(reports_dir, exist_ok=True)
    
    output_file = os.path.join(reports_dir, 'report.json')
    
    try:
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {output_file}")
    except PermissionError:
        # Try saving to current directory if permission denied
        output_file = 'report.json'
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {output_file}")


if __name__ == "__main__":
    run_evaluation()