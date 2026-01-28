#!/usr/bin/env python3
"""
Evaluation script for comparing repository_before and repository_after.

Runs tests on both repositories using environment variables and generates a comparison report.
"""

import sys
import json
import time
import uuid
import platform
import subprocess
import os
from pathlib import Path
from datetime import datetime

# Root directory (parent of evaluation/)
ROOT = Path(__file__).resolve().parent.parent

# Reports directory
REPORTS = ROOT / "evaluation" / "reports"


def environment_info():
    """Collect environment metadata."""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def run_tests(repo_path: Path, repo_name: str):
    """
    Run pytest tests on the specified repository.
    
    Uses environment variable REPO_TEST_REPO to indicate which repo to test.
    
    Args:
        repo_path: Path to the repository directory
        repo_name: Name for logging (e.g., "before" or "after")
    
    Returns:
        dict with test results
    """
    try:
        # Set environment variable to indicate which repo to test
        env = os.environ.copy()
        if "before" in repo_name.lower():
            env["REPO_TEST_REPO"] = "before"
        else:
            env["REPO_TEST_REPO"] = "after"
        
        # Run pytest from ROOT directory (where tests/ and conftest.py are)
        proc = subprocess.run(
            ["pytest", "tests", "-q"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            env=env
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
            "output": "pytest timeout (300s)"
        }
    
    except Exception as e:
        return {
            "passed": False,
            "return_code": -2,
            "output": f"Error running tests: {str(e)}"
        }


def run_metrics():
    """
    Collect performance and quality metrics.
    
    Returns:
        dict with numeric metrics
    """
    return {}


def evaluate_repository(repo_name: str):
    """
    Evaluate a single repository.
    
    Args:
        repo_name: Name of repository directory (e.g., "repository_before")
    
    Returns:
        dict with test and metric results
    """
    repo_path = ROOT / repo_name
    
    if not repo_path.exists():
        return {
            "tests": {
                "passed": False,
                "return_code": -3,
                "output": f"Repository not found: {repo_name}"
            },
            "metrics": {}
        }
    
    tests = run_tests(repo_path, repo_name)
    metrics = run_metrics()
    
    return {
        "tests": tests,
        "metrics": metrics
    }


def generate_improvement_summary(before_result: dict, after_result: dict) -> str:
    """
    Generate a human-readable summary of improvements.
    
    Args:
        before_result: Evaluation result for repository_before
        after_result: Evaluation result for repository_after
    
    Returns:
        str summary of changes
    """
    before_passed = before_result["tests"]["passed"]
    after_passed = after_result["tests"]["passed"]
    
    if after_passed and not before_passed:
        return "After implementation passed all tests while before failed. Refactoring successful."
    elif after_passed and before_passed:
        return "Both implementations pass tests. Refactoring maintained correctness."
    elif not after_passed and not before_passed:
        return "Both implementations fail tests. Refactoring did not improve correctness."
    else:
        return "Unexpected result: before passes but after fails."


def run_evaluation() -> dict:
    """
    Run the complete evaluation process.
    
    Returns:
        dict with full evaluation report
    """
    run_id = str(uuid.uuid4())
    start_time = datetime.utcnow()
    
    # Evaluate both repositories
    before = evaluate_repository("repository_before")
    after = evaluate_repository("repository_after")
    
    # Generate comparison
    comparison = {
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": generate_improvement_summary(before, after)
    }
    
    end_time = datetime.utcnow()
    
    return {
        "run_id": run_id,
        "started_at": start_time.isoformat() + "Z",
        "finished_at": end_time.isoformat() + "Z",
        "duration_seconds": (end_time - start_time).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }


def main() -> int:
    """
    Main entry point for the evaluation script.
    
    Returns:
        int exit code (0 for success, 1 for failure)
    """
    try:
        # Ensure reports directory exists
        REPORTS.mkdir(parents=True, exist_ok=True)
        
        # Run evaluation
        report = run_evaluation()
        
        # Write report to latest.json
        report_path = REPORTS / "latest.json"
        report_path.write_text(json.dumps(report, indent=2))
        
        # Print summary
        print(f"Evaluation complete: {report['success']}")
        print(f"Before: passed={report['before']['tests']['passed']}")
        print(f"After: passed={report['after']['tests']['passed']}")
        print(f"Duration: {report['duration_seconds']:.2f}s")
        print(f"Report written to: {report_path}")
        
        return 0 if report["success"] else 1
    
    except Exception as e:
        error_report = {
            "run_id": str(uuid.uuid4()),
            "started_at": datetime.utcnow().isoformat() + "Z",
            "finished_at": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": 0,
            "environment": environment_info(),
            "before": {"tests": {"passed": False, "return_code": -1, "output": ""}, "metrics": {}},
            "after": {"tests": {"passed": False, "return_code": -1, "output": ""}, "metrics": {}},
            "comparison": {"passed_gate": False, "improvement_summary": "Evaluation error"},
            "success": False,
            "error": str(e)
        }
        
        try:
            REPORTS.mkdir(parents=True, exist_ok=True)
            error_path = REPORTS / "latest.json"
            error_path.write_text(json.dumps(error_report, indent=2))
            print(f"Error report written to: {error_path}")
        except Exception:
            pass
        
        print(f"Evaluation failed with error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
