#!/usr/bin/env python3
"""
Evaluation script for shopping cart system
Runs tests and generates report in standardized format
"""
import sys
import os
import json
import platform
import socket
import subprocess
import uuid
from datetime import datetime
from decimal import Decimal

def get_environment_info():
    """Get system environment information"""
    return {
        "python_version": platform.python_version(),
        "platform": f"{platform.system().lower()}-{platform.machine().lower()}"
    }

def run_repository_test(repo_name):
    """Run test for a specific repository and capture output"""
    print(f"Running tests for {repo_name}...")
    
    try:
        # Change to the parent directory and run the test
        original_cwd = os.getcwd()
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.chdir(parent_dir)
        
        # Run the test and capture output
        result = subprocess.run(
            [sys.executable, "tests/run_single_repo_test.py", repo_name],
            capture_output=True,
            text=True
        )
        
        # Restore original directory
        os.chdir(original_cwd)
        
        return {
            "passed": result.returncode == 0,
            "return_code": result.returncode,
            "output": (result.stdout + result.stderr)[:2000] + ("..." if len(result.stdout + result.stderr) > 2000 else "")  # Include stderr and increase limit
        }
        
    except Exception as e:
        # Restore original directory in case of error
        try:
            os.chdir(original_cwd)
        except:
            pass
            
        return {
            "passed": False,
            "return_code": -1,
            "output": f"Error running test: {str(e)}"
        }

def main():
    """Main evaluation function"""
    print("Shopping Cart System Evaluation")
    print("=" * 50)
    
    # Start timing
    start_time = datetime.now()
    run_id = str(uuid.uuid4())
    
    try:
        # Get environment info
        env_info = get_environment_info()
        
        # Run tests for both repositories
        print("Testing repository_before...")
        before_results = run_repository_test('repository_before')
        
        print("Testing repository_after...")
        after_results = run_repository_test('repository_after')
        
        # End timing
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Determine if gate passed (after should pass, before should fail)
        passed_gate = after_results["passed"] and not before_results["passed"]
        
        # Create improvement summary
        if passed_gate:
            improvement_summary = "All bugs fixed: discount order corrected, item removal fixed, negative totals prevented, input validation added"
        elif after_results["passed"] and before_results["passed"]:
            improvement_summary = "Both repositories pass tests - may indicate test issues"
        elif not after_results["passed"] and not before_results["passed"]:
            improvement_summary = "Both repositories fail tests - fixes not working"
        else:
            improvement_summary = "Unexpected test results"
        
        # Create comprehensive report
        report = {
            "run_id": run_id,
            "started_at": start_time.isoformat() + "Z",
            "finished_at": end_time.isoformat() + "Z",
            "duration_seconds": duration,
            "environment": env_info,
            "before": {
                "tests": before_results,
                "metrics": {}
            },
            "after": {
                "tests": after_results,
                "metrics": {}
            },
            "comparison": {
                "passed_gate": passed_gate,
                "improvement_summary": improvement_summary
            },
            "success": True,
            "error": None
        }
        
    except Exception as e:
        # Handle any errors
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        report = {
            "run_id": run_id,
            "started_at": start_time.isoformat() + "Z",
            "finished_at": end_time.isoformat() + "Z",
            "duration_seconds": duration,
            "environment": get_environment_info(),
            "before": {
                "tests": {"passed": False, "return_code": -1, "output": ""},
                "metrics": {}
            },
            "after": {
                "tests": {"passed": False, "return_code": -1, "output": ""},
                "metrics": {}
            },
            "comparison": {
                "passed_gate": False,
                "improvement_summary": "Evaluation failed due to error"
            },
            "success": False,
            "error": str(e)
        }
    
    # Create reports directory
    reports_dir = os.path.join(os.path.dirname(__file__), 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    # Write report
    report_file = os.path.join(reports_dir, 'report.json')
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print(f"\n{'='*50}")
    print("EVALUATION SUMMARY")
    print(f"{'='*50}")
    print(f"Run ID: {report['run_id']}")
    print(f"Duration: {report['duration_seconds']:.2f} seconds")
    print(f"Environment: {report['environment']['platform']}")
    print(f"Python Version: {report['environment']['python_version']}")
    print()
    print(f"Repository Before: {'PASS' if report['before']['tests']['passed'] else 'FAIL'} (exit code: {report['before']['tests']['return_code']})")
    print(f"Repository After:  {'PASS' if report['after']['tests']['passed'] else 'FAIL'} (exit code: {report['after']['tests']['return_code']})")
    print(f"Gate Passed: {'YES' if report['comparison']['passed_gate'] else 'NO'}")
    print(f"Summary: {report['comparison']['improvement_summary']}")
    print()
    print(f"Report saved to: {report_file}")
    
    # Exit with appropriate code
    if report['success'] and report['comparison']['passed_gate']:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()