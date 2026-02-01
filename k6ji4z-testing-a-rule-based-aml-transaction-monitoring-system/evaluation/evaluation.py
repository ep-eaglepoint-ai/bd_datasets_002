#!/usr/bin/env python3
import sys
import json
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

def environment_info() -> dict:
    """Capture execution environment"""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

def run_tests(repo_name: str) -> dict:
    """
    Execute pytest on specified repository.
    For repository_before: runs meta-tests from /app/tests
    For repository_after: runs solution tests from repo's internal tests/
    Returns: {passed: bool, return_code: int, output: str}
    """
    try:
        repo_path = ROOT / repo_name
        
        if repo_name == "repository_before":
            # Run meta-tests from mounted /app/tests
            test_path = "/app/tests/comprehensive"
            if not Path(test_path).exists():
                return {
                    "passed": False,
                    "return_code": 1,
                    "output": f"Meta-tests not found at {test_path}"
                }
            proc = subprocess.run(
                ["pytest", test_path, "-v", "--tb=short"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=120
            )
        else:  # repository_after
            # Run solution tests from repository_after/tests
            test_path = repo_path / "tests"
            if not test_path.exists():
                return {
                    "passed": False,
                    "return_code": 1,
                    "output": f"No solution tests found in {repo_name}/tests"
                }
            proc = subprocess.run(
                ["pytest", "tests", "-v", "--tb=short"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=120
            )
        
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:8000]  # Truncate
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "pytest timeout (>120s)"
        }

def run_metrics(repo_path: Path) -> dict:
    """
    Optional: Collect task-specific metrics
    Examples: avg_time_ms, p95_time_ms, ops_per_second
    """
    return {}  # Implement if prompt requires performance metrics

def run_evaluation() -> dict:
    """
    Main evaluation logic.
    Expected: before passes meta-tests, after passes both meta-tests AND solution tests
    Returns: Standard report structure (see evaluation_runner_guide.pdf)
    """
    run_id = str(uuid.uuid4())
    start = datetime.utcnow()
    
    before = {
        "tests": run_tests("repository_before"),
        "metrics": run_metrics(ROOT / "repository_before")
    }
    
    after = {
        "tests": run_tests("repository_after"),
        "metrics": run_metrics(ROOT / "repository_after")
    }
    
    # Success means: before passes meta-tests, after passes solution tests
    comparison = {
        "passed_gate": before["tests"]["passed"] and after["tests"]["passed"],
        "improvement_summary": "Meta-tests validate solution tests work correctly"
    }
    
    end = datetime.utcnow()
    
    report = {
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
    
    # Save report
    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / f"report_{run_id}.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return report

def main() -> int:
    """
    Entry point. Returns 0 for success, 1 for failure.
    """
    try:
        report = run_evaluation()
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"Evaluation Report: {report['run_id']}")
        print(f"{'='*60}")
        print(f"Before (Meta-Tests) - Passed: {report['before']['tests']['passed']}")
        print(f"After (Solution Tests) - Passed: {report['after']['tests']['passed']}")
        print(f"Success: {report['success']}")
        print(f"{'='*60}\n")
        
        return 0 if report["success"] else 1
    except Exception as e:
        print(f"Evaluation failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
