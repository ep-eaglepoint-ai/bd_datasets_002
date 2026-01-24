#!/usr/bin/env python3

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime

REPO_BEFORE = os.path.join(os.path.dirname(__file__), '..', 'repository_before')
REPO_AFTER = os.path.join(os.path.dirname(__file__), '..', 'repository_after')

def run_tests(repo_path, repo_name):
    print(f"\n{'=' * 60}")
    print(f"Running tests on {repo_name}")
    print('=' * 60)
    
    output = ''
    passed = 0
    failed = 0
    total = 0
    
    try:
        # Set environment variable to tell tests which repo to check
        env = os.environ.copy()
        env['TEST_REPO_PATH'] = repo_path
        
        # Run the appropriate test file
        if 'before' in repo_name.lower():
            test_file = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_before.py')
        else:
            test_file = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_after.py')
        
        result = subprocess.run(
            [sys.executable, test_file],
            cwd=os.path.join(os.path.dirname(__file__), '..'),
            env=env,
            capture_output=True,
            text=True,
            timeout=120
        )
        output = result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        output = "Test execution timed out"
    except Exception as e:
        output = f"Error running tests: {str(e)}"
    
    print(output)
    
    # Parse results from JSON file
    if 'before' in repo_name.lower():
        results_file = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_before_results.json')
    else:
        results_file = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_after_results.json')
    
    if os.path.exists(results_file):
        with open(results_file, 'r') as f:
            results = json.load(f)
            passed = results.get('passed', 0)
            failed = results.get('failed', 0)
            total = results.get('total', 0)
    
    print(f"\nParsed results: {passed} passed, {failed} failed, {total} total")
    
    return {
        'success': failed == 0 and passed > 0,
        'passed': passed,
        'failed': failed,
        'total': total,
        'output': output
    }

def analyze_structure(repo_path):
    metrics = {
        'total_files': 0,
        'graph_files': 0,
        'has_graph_implementation': False,
        'graph_lines': 0
    }
    
    if not os.path.exists(repo_path):
        return metrics
    
    # Count Python files
    graph_file = os.path.join(repo_path, 'graph_implementation.py')
    if os.path.exists(graph_file):
        metrics['has_graph_implementation'] = True
        metrics['graph_files'] = 1
        with open(graph_file, 'r') as f:
            metrics['graph_lines'] = len(f.readlines())
    
    metrics['total_files'] = metrics['graph_files']
    
    return metrics

def generate_report(before_results, after_results, before_metrics, after_metrics):
    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')
    time_str = now.strftime('%H-%M-%S')
    
    report_dir = os.path.join(os.path.dirname(__file__), 'reports', date_str, time_str)
    os.makedirs(report_dir, exist_ok=True)
    
    fail_to_pass = []
    before_map = {test['name']: test['passed'] for test in before_results.get('tests', [])}
    after_map = {test['name']: test['passed'] for test in after_results.get('tests', [])}
    
    for test_name, before_passed in before_map.items():
        after_passed = after_map.get(test_name)
        if after_passed is not None and not before_passed and after_passed:
            fail_to_pass.append(test_name)
    
    report = {
        'run_id': f"{int(now.timestamp())}-{os.urandom(4).hex()}",
        'started_at': now.isoformat(),
        'finished_at': datetime.now().isoformat(),
        'environment': {
            'python_version': sys.version.split()[0],
            'platform': f"{sys.platform}-{sys.maxsize > 2**32 and '64bit' or '32bit'}"
        },
        'before': {
            'metrics': before_metrics,
            'tests': {
                'passed': before_results.get('passed', 0),
                'failed': before_results.get('failed', 0),
                'total': before_results.get('total', 0),
                'success': before_results.get('success', False)
            }
        },
        'after': {
            'metrics': after_metrics,
            'tests': {
                'passed': after_results.get('passed', 0),
                'failed': after_results.get('failed', 0),
                'total': after_results.get('total', 0),
                'success': after_results.get('success', False)
            }
        },
        'comparison': {
            'fail_to_pass': fail_to_pass,
            'tests_fixed': len(fail_to_pass),
            'tests_improved': after_results.get('passed', 0) - before_results.get('passed', 0),
            'structure_improved': not before_metrics.get('has_graph_implementation', False) and after_metrics.get('has_graph_implementation', False),
            'graph_implementation_exists': after_metrics.get('has_graph_implementation', False)
        },
        'success': (not before_results.get('success', True)) and after_results.get('success', False)
    }
    
    report_path = os.path.join(report_dir, 'report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Also write to latest.json
    latest_path = os.path.join(os.path.dirname(__file__), 'reports', 'latest.json')
    with open(latest_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return {'report': report, 'report_path': report_path}

def main():
    print('=' * 60)
    print('Go Graph Implementation Refactor Evaluation')
    print('=' * 60)
    
    # Analyze structures
    print('\n[1/5] Analyzing repository_before structure...')
    before_metrics = analyze_structure(REPO_BEFORE)
    print(f"  - Graph implementation: {before_metrics['has_graph_implementation']}")
    print(f"  - Graph lines: {before_metrics['graph_lines']}")
    print(f"  - Total files: {before_metrics['total_files']}")
    
    print('\n[2/5] Analyzing repository_after structure...')
    after_metrics = analyze_structure(REPO_AFTER)
    print(f"  - Graph implementation: {after_metrics['has_graph_implementation']}")
    print(f"  - Graph lines: {after_metrics['graph_lines']}")
    print(f"  - Total files: {after_metrics['total_files']}")
    
    # Run tests on before (should fail)
    print('\n[3/5] Running tests on repository_before (expected to FAIL)...')
    before_test_output = run_tests(REPO_BEFORE, 'repository_before')
    
    # Load before results from JSON
    before_results_file = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_before_results.json')
    before_results = {}
    if os.path.exists(before_results_file):
        with open(before_results_file, 'r') as f:
            before_results = json.load(f)
    else:
        before_results = before_test_output
    
    print(f"  ✗ Passed: {before_results.get('passed', 0)}")
    print(f"  ✗ Failed: {before_results.get('failed', 0)}")
    print(f"  ✗ Total: {before_results.get('total', 0)}")
    print(f"  ✗ Success: {before_results.get('success', False)}")
    
    # Run tests on after (should pass)
    print('\n[4/5] Running tests on repository_after (expected to PASS)...')
    after_test_output = run_tests(REPO_AFTER, 'repository_after')
    
    # Load after results from JSON
    after_results_file = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_after_results.json')
    after_results = {}
    if os.path.exists(after_results_file):
        with open(after_results_file, 'r') as f:
            after_results = json.load(f)
    else:
        after_results = after_test_output
    
    print(f"  ✓ Passed: {after_results.get('passed', 0)}")
    print(f"  ✓ Failed: {after_results.get('failed', 0)}")
    print(f"  ✓ Total: {after_results.get('total', 0)}")
    print(f"  ✓ Success: {after_results.get('success', False)}")
    
    # Generate report
    print('\n[5/5] Generating report...')
    result = generate_report(before_results, after_results, before_metrics, after_metrics)
    report = result['report']
    report_path = result['report_path']
    
    # Print summary
    print('\n' + '=' * 60)
    print('Evaluation Complete')
    print('=' * 60)
    print(f"\nOverall Success: {report['success']}")
    print(f"\nBefore (Buggy Implementation):")
    print(f"  - Tests Passed: {before_results.get('passed', 0)}/{before_results.get('total', 0)}")
    print(f"  - Tests Failed: {before_results.get('failed', 0)}/{before_results.get('total', 0)}")
    print(f"  - Has Graph Implementation: {before_metrics['has_graph_implementation']}")
    print(f"\nAfter (Fixed Implementation):")
    print(f"  - Tests Passed: {after_results.get('passed', 0)}/{after_results.get('total', 0)}")
    print(f"  - Tests Failed: {after_results.get('failed', 0)}/{after_results.get('total', 0)}")
    print(f"  - Has Graph Implementation: {after_metrics['has_graph_implementation']}")
    print(f"\nImprovements:")
    print(f"  - Tests fixed: {report['comparison']['tests_fixed']}")
    print(f"  - Tests improved: {report['comparison']['tests_improved']}")
    print(f"  - Structure improved: {report['comparison']['structure_improved']}")
    print(f"  - Graph implementation exists: {report['comparison']['graph_implementation_exists']}")
    print(f"\nReport saved to: {report_path}")
    
    sys.exit(0 if report['success'] else 1)

if __name__ == "__main__":
    main()
