#!/usr/bin/env python3
import os
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

def run_tests(repo_path: Path):
    # For new feature implementation, repository_before has no code, so tests should fail
    if repo_path.name == "repository_before":
        return {
            "passed": False,
            "return_code": 1,
            "output": "No implementation in repository_before for new feature"
        }
    try:
        env = dict(os.environ)
        env['PYTHONPATH'] = str(repo_path)
        proc = subprocess.run(
            ["pytest", "tests", "-q"],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=120
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

def run_metrics(repo_path: Path):
    # Optional – no metrics for this task
    return {}

def evaluate(repo_name: str):
    repo_path = ROOT / repo_name
    tests = run_tests(repo_path)
    metrics = run_metrics(repo_path)
    return {
        "tests": tests,
        "metrics": metrics
    }

def run_evaluation():
    run_id = str(uuid.uuid4())
    start = datetime.utcnow()
    before = evaluate("repository_before")
    after = evaluate("repository_after")
    comparison = {
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": "After implementation passed correctness tests"
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
    REPORTS.mkdir(parents=True, exist_ok=True)
    report = run_evaluation()
    path = REPORTS / "latest.json"
    path.write_text(json.dumps(report, indent=2))
    if report["success"]:
        print("Evaluation Success")
    else:
        print("Evaluation Failed")
    print(f"Report written to {path}")
    return 0 if report["success"] else 1

if __name__ == "__main__":
    sys.exit(main())