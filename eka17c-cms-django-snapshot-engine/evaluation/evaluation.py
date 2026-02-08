#!/usr/bin/env python3
"""
Evaluation script for Atomic Versioned Content Engine.
Compares repository_before (not implemented) with repository_after (implemented).
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


def run_tests():
    """Run pytest on the tests directory with proper Django settings."""
    tests_dir = ROOT / "tests"
    if not tests_dir.exists():
        return {
            "passed": False,
            "return_code": 1,
            "output": "Tests directory not found"
        }
    
    env = {
        **dict(__import__("os").environ),
        "DJANGO_SETTINGS_MODULE": "settings",
        "PYTHONPATH": str(ROOT / "repository_after")
    }
    
    try:
        proc = subprocess.run(
            ["pytest", "tests", "-q"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=120,
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
            "output": "pytest timeout"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": 1,
            "output": f"Error running tests: {str(e)}"
        }


def run_metrics():
    """Optional metrics collection."""
    return {}


def run_evaluation():
    """Run the full evaluation comparing before and after."""
    run_id = str(uuid.uuid4())
    start = datetime.utcnow()
    
    # repository_before - no implementation, tests not available
    before = {
        "tests": {
            "passed": False,
            "return_code": 1,
            "output": "No tests available - repository_before has no implementation"
        },
        "metrics": {}
    }
    
    # repository_after - run actual tests
    after_tests = run_tests()
    after = {
        "tests": after_tests,
        "metrics": run_metrics()
    }
    
    comparison = {
        "passed_gate": after_tests["passed"],
        "improvement_summary": "After implementation passes all correctness tests" if after_tests["passed"] else "After implementation has failing tests"
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
    report = run_evaluation()
    path = REPORTS / "latest.json"
    path.write_text(json.dumps(report, indent=2))
    print(f"Report written to {path}")
    return 0 if report["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
