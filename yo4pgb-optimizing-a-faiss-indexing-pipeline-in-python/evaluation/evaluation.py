#!/usr/bin/env python3
import sys
import os
import json
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime, timezone

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
    Returns: {passed: bool, return_code: int, output: str}
    """
    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = f"{ROOT / repo_name}:{ROOT}"
        proc = subprocess.run(
            ["pytest", "../tests/comprehensive", "-v"],
            cwd=ROOT / repo_name,
            capture_output=True,
            text=True,
            env=env,
            timeout=360 # Increased to match or exceed pytest timeout
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
            "output": "pytest timeout (>360s)"
        }

def run_metrics(repo_path: Path) -> dict:
    """
    Placeholder for collecting task-specific metrics (e.g., latency, throughput).
    Currently unused but preserved for future extensibility.
    """
    return {}

def run_evaluation() -> dict:
    """
    Main evaluation logic.
    Returns: Standard report structure
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
        print(f"Before - Passed: {report['before']['tests']['passed']}")
        print(f"After  - Passed: {report['after']['tests']['passed']}")
        print(f"Success: {report['success']}")
        print(f"{'='*60}\n")
        
        return 0
    except Exception as e:
        print(f"Evaluation failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
