"""
Evaluation script for Bulk Import Tool
Runs tests and generates metrics.json report
"""
import json
import subprocess
import sys
import time
import os
from datetime import datetime
from pathlib import Path


def check_app_running(url: str = "http://localhost:3000", timeout: int = 5) -> bool:
    """Check if the Next.js app is running"""
    import urllib.request
    try:
        urllib.request.urlopen(url, timeout=timeout)
        return True
    except Exception:
        return False


def run_tests(app_url: str = "http://localhost:3000") -> dict:
    """Run the test suite and collect metrics"""
    start_time = time.time()
    
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    tests_dir = project_root / "tests"
    
    # Check if tests directory exists
    test_file = tests_dir / "test_bulk_import.py"
    if not test_file.exists():
        return {
            "timestamp": datetime.now().isoformat(),
            "execution_time_seconds": 0,
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "pass_rate": 0,
            "status": "error",
            "tests": [],
            "error_logs": [f"Test file not found: {test_file}"],
            "stdout": "",
            "stderr": ""
        }
    
    # Run pytest
    result = subprocess.run(
        [
            sys.executable, "-m", "pytest",
            str(test_file),
            "-v",
            "--tb=short",
            "-q"
        ],
        capture_output=True,
        text=True,
        cwd=str(project_root),
        env={**os.environ, "APP_URL": app_url}
    )
    
    end_time = time.time()
    execution_time = end_time - start_time
    
    # Parse test results from stdout
    test_results = []
    passed = 0
    failed = 0
    errors = []
    
    stdout_lines = result.stdout.split('\n')
    for line in stdout_lines:
        if '::test_' in line or '::Test' in line:
            if 'PASSED' in line:
                passed += 1
                test_name = line.split('::')[-1].split()[0] if '::' in line else line
                test_results.append({
                    "name": test_name,
                    "status": "pass",
                    "duration": None,
                    "error": None
                })
            elif 'FAILED' in line:
                failed += 1
                test_name = line.split('::')[-1].split()[0] if '::' in line else line
                test_results.append({
                    "name": test_name,
                    "status": "fail",
                    "duration": None,
                    "error": None
                })
            elif 'ERROR' in line:
                failed += 1
                test_name = line.split('::')[-1].split()[0] if '::' in line else line
                test_results.append({
                    "name": test_name,
                    "status": "error",
                    "duration": None,
                    "error": None
                })
    
    # If we couldn't parse individual tests, check return code
    if not test_results:
        if result.returncode == 0:
            passed = 1
            test_results.append({
                "name": "all_tests",
                "status": "pass",
                "duration": execution_time,
                "error": None
            })
        else:
            failed = 1
            errors.append(result.stderr or result.stdout)
            test_results.append({
                "name": "all_tests",
                "status": "fail",
                "duration": execution_time,
                "error": result.stderr or result.stdout
            })
    
    if result.returncode != 0 and result.stderr:
        errors.append(result.stderr[:2000])
    
    return {
        "timestamp": datetime.now().isoformat(),
        "execution_time_seconds": round(execution_time, 3),
        "total_tests": passed + failed,
        "passed": passed,
        "failed": failed,
        "pass_rate": round(passed / max(passed + failed, 1) * 100, 2),
        "status": "success" if failed == 0 and passed > 0 else "failure",
        "tests": test_results,
        "error_logs": errors,
        "stdout": result.stdout[:5000] if result.stdout else "",
        "stderr": result.stderr[:5000] if result.stderr else ""
    }


def main():
    """Main entry point for evaluation"""
    print("=" * 60)
    print("Bulk Import Tool - Evaluation Runner")
    print("=" * 60)
    print()
    
    # Get app URL from environment or use default
    app_url = os.environ.get("APP_URL", "http://localhost:3000")
    
    # Check if Next.js app is running
    print(f"Checking if Next.js app is running at {app_url}...")
    if not check_app_running(app_url):
        print(f"✗ Next.js app is not running at {app_url}")
        print("Please start the app with: cd repository_after && npm run dev")
        
        # Create a metrics file indicating the app isn't running
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "execution_time_seconds": 0,
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "pass_rate": 0,
            "status": "error",
            "tests": [],
            "error_logs": [f"Next.js app is not running at {app_url}. Start with: cd repository_after && npm run dev"],
            "stdout": "",
            "stderr": ""
        }
    else:
        print(f"✓ Next.js app is running at {app_url}")
        print()
        print("Running tests...")
        print("-" * 60)
        
        metrics = run_tests(app_url)
    
    # Save metrics
    script_dir = Path(__file__).parent
    metrics_path = script_dir / "report.json"
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print()
    print("=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print(f"Total Tests: {metrics['total_tests']}")
    print(f"Passed: {metrics['passed']}")
    print(f"Failed: {metrics['failed']}")
    print(f"Pass Rate: {metrics['pass_rate']}%")
    print(f"Execution Time: {metrics['execution_time_seconds']}s")
    print(f"Status: {metrics['status'].upper()}")
    print()
    print(f"Report saved to: {metrics_path}")
    
    if metrics['error_logs']:
        print()
        print("Error Logs:")
        for error in metrics['error_logs'][:5]:
            print(f"  - {str(error)[:200]}...")
    
    # Return exit code based on status
    return 0 if metrics['status'] == 'success' else 1


if __name__ == "__main__":
    sys.exit(main())
