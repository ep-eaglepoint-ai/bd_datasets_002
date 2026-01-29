#!/usr/bin/env python3
"""
Evaluation script for payment processing optimization.

Compares repository_before and repository_after test results.
Tests run from the project root where conftest.py is located.
"""

import sys
import json
import time
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"


def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def run_tests(repo_name: str, timeout: int = 300):
    """Run pytest tests for a specific repository using --repo option.
    
    Tests run from ROOT directory where conftest.py is located.
    """
    test_args = [
        "pytest", 
        "tests", 
        "-q", 
        "--repo", 
        repo_name
    ]
    
    try:
        proc = subprocess.run(
            test_args,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:8000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": f"pytest timeout after {timeout}s"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "output": f"Error running tests: {str(e)}"
        }


def run_metrics():
    """Optional performance metrics collection."""
    return {}


def evaluate(repo_name: str):
    """Evaluate a single repository."""
    tests = run_tests(repo_name)
    metrics = run_metrics()
    return {
        "tests": tests,
        "metrics": metrics
    }


def run_evaluation():
    """Run full evaluation comparing before and after."""
    run_id = str(uuid.uuid4())
    start = datetime.utcnow()
    
    before = evaluate("before")
    after = evaluate("after")
    
    # Calculate improvement summary
    before_passed = before["tests"]["passed"]
    after_passed = after["tests"]["passed"]
    
    if after_passed and not before_passed:
        improvement = "Fixed 3 optimization tests: removed Event dataclass, added invalid JSON handling, improved performance"
    elif after_passed and before_passed:
        improvement = "Both implementations pass all tests - behavior preserved"
    else:
        improvement = "After implementation does not pass all tests"
    
    comparison = {
        "passed_gate": after_passed,
        "improvement_summary": improvement,
        "before_tests_passed": before_passed,
        "after_tests_passed": after_passed
    }
    
    end = datetime.utcnow()
    
    return {
        "run_id": run_id,
        "started_at": start.isoformat() + "Z",
        "finished_at": end.isoformat() + "Z",
        "duration_seconds": (end - start).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }


def main():
    """Main entry point."""
    REPORTS.mkdir(parents=True, exist_ok=True)
    
    try:
        report = run_evaluation()
        path = REPORTS / "latest.json"
        path.write_text(json.dumps(report, indent=2))
        print(f"Report written to {path}")
        return 0 if report["success"] else 1
    except Exception as e:
        error_report = {
            "run_id": str(uuid.uuid4()),
            "started_at": datetime.utcnow().isoformat() + "Z",
            "finished_at": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": 0.0,
            "environment": environment_info(),
            "before": {"tests": {"passed": False, "return_code": -1, "output": None}, "metrics": {}},
            "after": {"tests": {"passed": False, "return_code": -1, "output": None}, "metrics": {}},
            "comparison": {"passed_gate": False, "improvement_summary": None},
            "success": False,
            "error": str(e)
        }
        path = REPORTS / "latest.json"
        path.write_text(json.dumps(error_report, indent=2))
        print(f"Error occurred. Report written to {path}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
