#!/usr/bin/env python3
"""Evaluation script for fetch_user_activity_summary performance optimization."""

import sys
import os
import time
import threading
import json
import uuid
import platform
import subprocess
import psutil
import importlib.util
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from statistics import mean, median


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
                        continue
                    
                    tests.append({
                        'nodeid': nodeid,
                        'outcome': outcome
                    })
        
        return {
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'tests': tests
        }
        
    except subprocess.TimeoutExpired:
        return {
            'returncode': -1,
            'stdout': '',
            'stderr': 'Test execution timed out',
            'tests': []
        }
    except Exception as e:
        return {
            'returncode': -1,
            'stdout': '',
            'stderr': str(e),
            'tests': []
        }


def load_implementation(repo_dir):
    """Load implementation from specified repository."""
    # Add the repository directory to path
    repo_path = os.path.join('/app', repo_dir)
    if repo_path not in sys.path:
        sys.path.insert(0, repo_path)
    
    # Also add the parent directory for relative imports
    if '/app' not in sys.path:
        sys.path.insert(0, '/app')
    
    # Import the module
    if repo_dir == 'repository_before':
        from repository_before.fetch_user_activity_summary import fetch_user_activity_summary
        # Create a mock module object
        class MockModule:
            def __init__(self):
                self.fetch_user_activity_summary = fetch_user_activity_summary
        return MockModule()
    else:
        from repository_after.fetch_user_activity_summary import fetch_user_activity_summary
        # Create a mock module object
        class MockModule:
            def __init__(self):
                self.fetch_user_activity_summary = fetch_user_activity_summary
        return MockModule()


def setup_test_data():
    """Set up test data for performance evaluation."""
    # Import DB from repository_before (both should have same DB setup)
    sys.path.insert(0, '/app/repository_before')
    from db import DB
    
    db = DB()
    
    with db.conn.cursor() as cur:
        # Clear existing data
        cur.execute("DELETE FROM events")
        
        # Insert test data for performance comparison
        test_events = []
        
        # User 1: High volume user (100K events)
        for i in range(100000):
            event_type = ['click', 'view', 'purchase'][i % 3]
            price = 12.99 if event_type == 'purchase' else None
            metadata = json.dumps({'price': price} if price else {})
            test_events.append((i, 1, event_type, metadata))
        
        # Add some duplicates to test de-duplication
        for i in range(5000):
            test_events.append((i, 1, 'click', json.dumps({})))
        
        # User 2: Medium volume user (10K events)
        for i in range(10000):
            event_type = ['click', 'view'][i % 2]
            test_events.append((100000 + i, 2, event_type, json.dumps({})))
        
        # User 3: Low volume user (100 events)
        for i in range(100):
            event_type = ['click', 'view', 'purchase'][i % 3]
            price = 5.99 if event_type == 'purchase' else None
            metadata = json.dumps({'price': price} if price else {})
            test_events.append((200000 + i, 3, event_type, metadata))
        
        # Bulk insert in batches
        batch_size = 10000
        for i in range(0, len(test_events), batch_size):
            batch = test_events[i:i + batch_size]
            cur.executemany(
                "INSERT INTO events (id, user_id, type, metadata) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                batch
            )
        
        db.conn.commit()
    
    return db


def benchmark_performance(before_module, after_module, user_id, iterations=10):
    """Benchmark performance comparison between implementations."""
    
    # Warm up
    before_module.fetch_user_activity_summary(user_id)
    after_module.fetch_user_activity_summary(user_id)
    
    # Benchmark before implementation
    before_times = []
    before_memory_deltas = []
    process = psutil.Process()
    
    for _ in range(iterations):
        mem_before = process.memory_info().rss
        start_time = time.time()
        result_before = before_module.fetch_user_activity_summary(user_id)
        end_time = time.time()
        mem_after = process.memory_info().rss
        
        before_times.append(end_time - start_time)
        before_memory_deltas.append(mem_after - mem_before)
    
    # Benchmark after implementation
    after_times = []
    after_memory_deltas = []
    
    for _ in range(iterations):
        mem_before = process.memory_info().rss
        start_time = time.time()
        result_after = after_module.fetch_user_activity_summary(user_id)
        end_time = time.time()
        mem_after = process.memory_info().rss
        
        after_times.append(end_time - start_time)
        after_memory_deltas.append(mem_after - mem_before)
    
    # Verify functional parity
    functional_parity = result_before == result_after
    
    return {
        'user_id': user_id,
        'iterations': iterations,
        'functional_parity': functional_parity,
        'before_result': result_before,
        'after_result': result_after,
        'before_performance': {
            'mean_time': mean(before_times),
            'median_time': median(before_times),
            'min_time': min(before_times),
            'max_time': max(before_times),
            'mean_memory_delta': mean(before_memory_deltas),
            'max_memory_delta': max(before_memory_deltas)
        },
        'after_performance': {
            'mean_time': mean(after_times),
            'median_time': median(after_times),
            'min_time': min(after_times),
            'max_time': max(after_times),
            'mean_memory_delta': mean(after_memory_deltas),
            'max_memory_delta': max(after_memory_deltas)
        },
        'improvement': {
            'time_ratio': mean(before_times) / mean(after_times) if mean(after_times) > 0 else 999999,
            'memory_ratio': mean(before_memory_deltas) / mean(after_memory_deltas) if mean(after_memory_deltas) > 0 else 999999
        }
    }


def test_scalability(after_module, user_ids, target_time=0.2):
    """Test scalability characteristics of the after implementation."""
    results = []
    
    for user_id in user_ids:
        times = []
        process = psutil.Process()
        
        for _ in range(5):  # 5 iterations per user
            mem_before = process.memory_info().rss
            start_time = time.time()
            result = after_module.fetch_user_activity_summary(user_id)
            end_time = time.time()
            mem_after = process.memory_info().rss
            
            times.append(end_time - start_time)
        
        avg_time = mean(times)
        meets_target = avg_time < target_time
        
        results.append({
            'user_id': user_id,
            'avg_time': avg_time,
            'meets_target': meets_target,
            'result': result
        })
    
    return results


def main():
    """Main evaluation function."""
    print("Starting fetch_user_activity_summary performance evaluation...")
    
    # Get environment info
    env_info = get_environment_info()
    
    # Set up test data
    print("Setting up test data...")
    db = setup_test_data()
    
    # Load implementations
    print("Loading implementations...")
    before_module = load_implementation('repository_before')
    after_module = load_implementation('repository_after')
    
    # Run pytest tests
    print("Running before implementation tests...")
    before_test_results = run_pytest_tests('repository_before')
    
    print("Running after implementation tests...")
    after_test_results = run_pytest_tests('repository_after')
    
    # Run meta tests
    print("Running meta tests...")
    meta_test_cmd = [sys.executable, '-m', 'pytest', 'tests/test_meta.py', '-v']
    meta_result = subprocess.run(meta_test_cmd, cwd='/app', capture_output=True, text=True)
    
    # Performance benchmarks
    print("Running performance benchmarks...")
    benchmarks = []
    
    # Test different user volumes
    test_users = [1, 2, 3]  # High, medium, low volume users
    
    for user_id in test_users:
        print(f"Benchmarking user {user_id}...")
        benchmark = benchmark_performance(before_module, after_module, user_id)
        benchmarks.append(benchmark)
    
    # Scalability test
    print("Running scalability tests...")
    scalability_results = test_scalability(after_module, test_users)
    
    # Generate report
    report = {
        'evaluation_id': str(uuid.uuid4()),
        'timestamp': datetime.now().isoformat(),
        'environment': env_info,
        'test_results': {
            'before_tests': before_test_results,
            'after_tests': after_test_results,
            'meta_tests': {
                'returncode': meta_result.returncode,
                'stdout': meta_result.stdout,
                'stderr': meta_result.stderr
            }
        },
        'performance_benchmarks': benchmarks,
        'scalability_results': scalability_results,
        'summary': {
            'functional_parity_passed': all(b['functional_parity'] for b in benchmarks),
            'performance_improvements': [
                {
                    'user_id': b['user_id'],
                    'time_improvement': f"{b['improvement']['time_ratio']:.2f}x" if b['improvement']['time_ratio'] < 999999 else "999999x+",
                    'memory_improvement': f"{b['improvement']['memory_ratio']:.2f}x" if b['improvement']['memory_ratio'] < 999999 else "999999x+"
                }
                for b in benchmarks
            ],
            'scalability_targets_met': all(r['meets_target'] for r in scalability_results)
        }
    }
    
    # Save report with proper folder structure
    now = datetime.now()
    date_folder = now.strftime('%Y-%m-%d')
    time_folder = now.strftime('%H-%M-%S')
    report_dir = f"/app/evaluation/reports/{date_folder}/{time_folder}"
    os.makedirs(report_dir, exist_ok=True)
    report_file = f"{report_dir}/report.json"
    
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print("\n" + "="*80)
    print("EVALUATION SUMMARY")
    print("="*80)
    
    print(f"Functional Parity: {'✓ PASSED' if report['summary']['functional_parity_passed'] else '✗ FAILED'}")
    print(f"Scalability Targets: {'✓ MET' if report['summary']['scalability_targets_met'] else '✗ NOT MET'}")
    
    print("\nPerformance Improvements:")
    for improvement in report['summary']['performance_improvements']:
        print(f"  User {improvement['user_id']}: {improvement['time_improvement']} faster, {improvement['memory_improvement']} memory reduction")
    
    print(f"\nDetailed report saved to: {report_file}")
    
    # Clean up
    with db.conn.cursor() as cur:
        cur.execute("DELETE FROM events")
        db.conn.commit()
    
    print("Evaluation completed.")


if __name__ == "__main__":
    main()
