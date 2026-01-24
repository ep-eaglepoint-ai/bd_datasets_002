#!/usr/bin/env python3
import sys
import json
import time
import uuid
import platform
import subprocess
import os
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

def run_tests(repo_name: str):
    env = os.environ.copy()
    env['REPO_PATH'] = repo_name
    try:
        proc = subprocess.run(
            ["pytest", "tests", "-q"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120,
            env=env
        )
        full_output = proc.stdout + proc.stderr
        # Extract the summary line (last line with "X passed/failed in Y s")
        lines = full_output.strip().split('\n')
        summary_line = None
        for line in reversed(lines):
            if 'passed' in line or 'failed' in line:
                summary_line = line
                break
        output = summary_line if summary_line else full_output[:8000]
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": output
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "pytest timeout"
        }

def run_metrics(repo_path: Path):
    # Optional – trainers implement if needed
    return {}

def evaluate(repo_name: str):
    repo_path = ROOT / repo_name
    tests = run_tests(repo_name)
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
        "passed_gate": before["tests"]["passed"] == False and after["tests"]["passed"] == True,
        "improvement_summary": "Before had test failures, after passed all tests"
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
    print(f"Report written to {path}")
    if report["success"]:
        print("evaluation succeed ✅✅")
    else:
        print("evaluation failed ❌❌")
    return 0 if report["success"] else 1

if __name__ == "__main__":
    sys.exit(main())
