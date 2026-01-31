import json
import os
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


def run_tests(test_path: str, import_path: str) -> Dict[str, Any]:
    """
    Run pytest tests and capture results.
    
    Args:
        test_path: Path to test file
        import_path: Path to add to sys.path for imports
        
    Returns:
        Dictionary with test results, execution time, and status
    """
    # Add import path
    if import_path not in sys.path:
        sys.path.insert(0, import_path)
    
    # Run pytest and capture output
    start_time = time.time()
    
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pytest", test_path, "-v", "--tb=short"],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            env={**os.environ, "PYTHONPATH": import_path}
        )
        elapsed_time = time.time() - start_time
        
        # Parse pytest output to extract test counts
        stdout_lines = result.stdout.split('\n')
        test_count = 0
        passed_count = 0
        failed_count = 0
        
        for line in stdout_lines:
            if " passed" in line or " failed" in line or " error" in line:
                # Try to extract numbers from lines like "5 passed, 2 failed"
                import re
                numbers = re.findall(r'\d+', line)
                if numbers:
                    if "passed" in line:
                        passed_count = int(numbers[0]) if numbers else 0
                    if "failed" in line:
                        failed_count = int(numbers[0]) if numbers else 0
                    if "error" in line:
                        failed_count += int(numbers[0]) if numbers else 0
        
        test_count = passed_count + failed_count
        
        return {
            "status": "passed" if result.returncode == 0 else "failed",
            "return_code": result.returncode,
            "execution_time_seconds": elapsed_time,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "test_count": test_count,
            "passed_count": passed_count,
            "failed_count": failed_count,
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "return_code": -1,
            "execution_time_seconds": 300,
            "stdout": "",
            "stderr": "Test execution timed out after 300 seconds",
            "pytest_report": {},
            "test_count": 0,
            "passed_count": 0,
            "failed_count": 0,
        }
    except Exception as e:
        return {
            "status": "error",
            "return_code": -1,
            "execution_time_seconds": time.time() - start_time,
            "stdout": "",
            "stderr": str(e),
            "pytest_report": {},
            "test_count": 0,
            "passed_count": 0,
            "failed_count": 0,
        }


def generate_report() -> Dict[str, Any]:
    """
    Generate comprehensive evaluation report.
    
    Returns:
        Dictionary containing full evaluation report
    """
    project_root = Path(__file__).parent.parent
    test_file = project_root / "tests" / "test_solution.py"
    
    report = {
        "evaluation_timestamp": datetime.now().isoformat(),
        "project_id": "2CZYGD",
        "project_name": "Binary String Trade Optimization",
        "category": "sft",
        "task_type": "feature_generation",  # 0-1 gen task
        "evaluation_results": {}
    }
    
    # Note: repository_before is empty for feature generation tasks
    # Skip evaluation of repository_before
    report["evaluation_results"]["repository_before"] = {
        "status": "skipped",
        "note": "repository_before is empty for feature generation (0-1 gen) tasks"
    }
    
    # Evaluate repository_after (Ground Truth)
    after_path = str(project_root / "repository_after")
    print("Evaluating repository_after (Ground Truth solution)...")
    after_results = run_tests(str(test_file), after_path)
    report["evaluation_results"]["repository_after"] = after_results
    
    # Calculate metrics
    report["metrics"] = {
        "before_status": "skipped",
        "after_status": after_results["status"],
        "after_test_count": after_results.get("test_count", 0),
        "after_passed": after_results.get("passed_count", 0),
        "after_failed": after_results.get("failed_count", 0),
        "after_execution_time": after_results.get("execution_time_seconds", 0),
    }
    
    # Determine overall status based on repository_after
    if after_results["status"] == "passed":
        report["overall_status"] = "PASS"
    elif after_results["status"] == "failed":
        report["overall_status"] = "FAIL"
    else:
        report["overall_status"] = "ERROR"
    
    return report


def save_report(report: Dict[str, Any]) -> str:
    """
    Save report to evaluation/reports/yy-mm-dd/hr-min-sec/report.json
    
    Args:
        report: Report dictionary to save
        
    Returns:
        Path to saved report file
    """
    project_root = Path(__file__).parent.parent
    reports_dir = project_root / "evaluation" / "reports"
    
    # Create directory structure: yy-mm-dd/hr-min-sec/
    now = datetime.now()
    date_dir = reports_dir / now.strftime("%y-%m-%d")
    time_dir = date_dir / now.strftime("%H-%M-%S")
    time_dir.mkdir(parents=True, exist_ok=True)
    
    # Save report
    report_file = time_dir / "report.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    
    return str(report_file)


def main():
    """Main evaluation function"""
    print("=" * 60)
    print("Binary String Trade Optimization - Evaluation")
    print("=" * 60)
    print()
    
    # Generate report
    report = generate_report()
    
    # Save report
    report_path = save_report(report)
    
    # Print summary
    print()
    print("=" * 60)
    print("Evaluation Summary")
    print("=" * 60)
    print(f"Task Type:                 Feature Generation (0-1 gen)")
    print(f"Repository Before:         Skipped (empty for feature generation)")
    print(f"Repository After Status:  {report['metrics']['after_status']}")
    print(f"Overall Status:           {report['overall_status']}")
    print()
    print(f"Tests Passed: {report['metrics']['after_passed']}/{report['metrics']['after_test_count']}")
    print(f"Tests Failed: {report['metrics']['after_failed']}")
    print(f"Execution Time: {report['metrics']['after_execution_time']:.2f}s")
    print()
    print(f"Report saved to: {report_path}")
    print("=" * 60)
    
    # Return appropriate exit code
    if report["overall_status"] == "PASS":
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
