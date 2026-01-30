#!/usr/bin/env python3
import sys
import json
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

def environment_info() -> dict:
    """Capture execution environment details including Python version and platform."""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

def run_tests(repo_name: str) -> dict:
    """
    Execute pytest on specified repository.
    
    Args:
        repo_name: Name of the repository directory to test.
    
    Returns:
        Dictionary with keys: passed (bool), return_code (int), output (str).
    """
    try:
        # Use absolute path to tests directory to ensure they are found regardless of CWD
        test_path = ROOT / "tests"
        
        proc = subprocess.run(
            ["pytest", str(test_path), "-v"],
            cwd=ROOT / repo_name,
            capture_output=True,
            text=True,
            timeout=120
        )
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:8000]  # Truncate to prevent excessive output
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "pytest timeout (>120s)"
        }

def run_metrics(repo_path: Path) -> dict:
    """
    Collect task-specific metrics (optional).
    
    Args:
        repo_path: Path to the repository to analyze.
    
    Returns:
        Dictionary of metrics (e.g., avg_time_ms, p95_time_ms, ops_per_second).
        Currently returns empty dict - implement if performance metrics are required.
    """
    return {}

def run_evaluation() -> dict:
    """
    Main evaluation logic that runs tests on both repositories and generates a report.
    
    Returns:
        Dictionary containing the evaluation report with standard structure.
    """
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    
    before = {
        "tests": run_tests("repository_before"),
        "metrics": run_metrics(ROOT / "repository_before")
    }
    
    after = {
        "tests": run_tests("repository_after"),
        "metrics": run_metrics(ROOT / "repository_after")
    }
    
    comparison = {
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": "Tests passed after implementation"
    }
    
    end = datetime.now(timezone.utc)
    
    report = {
        "run_id": run_id,
        "started_at": start.isoformat(),
        "finished_at": end.isoformat(),
        "duration_seconds": (end - start).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }
    
    # Save report to file
    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / f"report_{run_id}.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return report

def main() -> int:
    """
    Entry point for the evaluation script.
    
    Returns:
        0 for success, 1 for failure.
    """
    try:
        report = run_evaluation()
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"Evaluation Report: {report['run_id']}")
        print(f"{'='*60}")
        print(f"Before - Passed: {report['before']['tests']['passed']}")
        print(f"After  - Passed: {report['after']['tests']['passed']}")
        print(f"Success: {report['success']}")
        print(f"{'='*60}\n")
        
        return 0 if report["success"] else 1
    except Exception as e:
        print(f"Evaluation failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
