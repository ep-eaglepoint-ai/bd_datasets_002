"""
Evaluation system for task assignment engine.

Generates structured JSON reports with test results and performance metrics.
"""

import json
import os
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path

# Add repository_after to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_after'))


def run_tests():
    """Run test suite and capture results."""
    try:
        result = subprocess.run(
            ['pytest', '-q', 'tests', '--tb=short'],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        return {
            'passed': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            'passed': False,
            'stdout': '',
            'stderr': 'Test execution timed out',
            'returncode': -1
        }
    except Exception as e:
        return {
            'passed': False,
            'stdout': '',
            'stderr': str(e),
            'returncode': -1
        }


def measure_performance():
    """Measure performance metrics."""
    from assignment_engine import TaskAssignmentEngine
    
    metrics = {
        'count_time_ms': 0,
        'max_skill_time_ms': 0,
        'enumeration_time_ms': 0
    }
    
    try:
        # Test count performance (dense case)
        num_workers = 20
        num_tasks = 20
        matrix = [[True] * num_tasks for _ in range(num_workers)]
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        
        start = time.time()
        engine.count_distributions()
        metrics['count_time_ms'] = (time.time() - start) * 1000
        
        # Test max-skill performance
        import random
        random.seed(42)
        skill_scores = [[random.random() for _ in range(num_tasks)] for _ in range(num_workers)]
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix, skill_scores=skill_scores)
        
        start = time.time()
        engine.find_max_skill_assignment()
        metrics['max_skill_time_ms'] = (time.time() - start) * 1000
        
        # Test enumeration performance
        num_workers = 5
        num_tasks = 5
        matrix = [[True] * num_tasks for _ in range(num_workers)]
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        
        start = time.time()
        engine.enumerate_distributions(page=0, page_size=100)
        metrics['enumeration_time_ms'] = (time.time() - start) * 1000
        
    except Exception as e:
        print(f"Performance measurement error: {e}", file=sys.stderr)
    
    return metrics


def check_constraints():
    """Verify constraint requirements are met."""
    constraints_verified = True
    
    try:
        metrics = measure_performance()
        
        # Check performance constraints
        if metrics['count_time_ms'] >= 2000:
            constraints_verified = False
        if metrics['max_skill_time_ms'] >= 200:
            constraints_verified = False
        if metrics['enumeration_time_ms'] >= 100:
            constraints_verified = False
            
    except Exception:
        constraints_verified = False
    
    return constraints_verified


def generate_report():
    """Generate evaluation report."""
    print("Running tests...", file=sys.stderr)
    test_results = run_tests()
    
    print("Measuring performance...", file=sys.stderr)
    performance = measure_performance()
    
    print("Checking constraints...", file=sys.stderr)
    constraints_verified = check_constraints()
    
    report = {
        'tests_passed': test_results['passed'],
        'performance': performance,
        'constraints_verified': constraints_verified,
        'test_output': {
            'stdout': test_results['stdout'],
            'stderr': test_results['stderr'],
            'returncode': test_results['returncode']
        },
        'timestamp': datetime.now().isoformat()
    }
    
    return report


def save_report(report):
    """Save report to JSON files."""
    # Save to evaluation directory (for CodeBuild to find)
    eval_dir = Path(__file__).parent
    eval_dir.mkdir(exist_ok=True)
    
    # Save to report.json in evaluation directory
    report_path = eval_dir / 'report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Also save to reports subdirectory
    reports_dir = eval_dir / 'reports'
    reports_dir.mkdir(exist_ok=True)
    
    # Save to latest.json
    latest_path = reports_dir / 'latest.json'
    with open(latest_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Save to dated directory
    date_str = datetime.now().strftime('%Y-%m-%d')
    timestamp_str = datetime.now().strftime('%H%M%S')
    dated_dir = reports_dir / date_str / timestamp_str
    dated_dir.mkdir(parents=True, exist_ok=True)
    
    dated_path = dated_dir / 'report.json'
    with open(dated_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return report_path, latest_path, dated_path


def main():
    """Main evaluation entry point."""
    report = generate_report()
    paths = save_report(report)
    
    # Print report to stdout (JSON format)
    print(json.dumps(report, indent=2))
    
    # Print paths to stderr
    print(f"\nReports saved to:", file=sys.stderr)
    for path in paths:
        print(f"  - {path}", file=sys.stderr)
    
    # Exit with appropriate code
    if report['tests_passed'] and report['constraints_verified']:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
