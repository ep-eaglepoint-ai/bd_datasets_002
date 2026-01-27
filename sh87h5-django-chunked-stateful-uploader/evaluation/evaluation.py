#!/usr/bin/env python3
import json
import os
import platform
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"


def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def run_tests(repo_path: Path):
    manage_py = repo_path / "manage.py"
    if not manage_py.exists():
        return {
            "passed": False,
            "return_code": 2,
            "output": f"manage.py not found in {repo_path}"
        }

    try:
        env = os.environ.copy()
        env["DJANGO_SETTINGS_MODULE"] = "resumable_uploads.settings"
        proc = subprocess.run(
            [sys.executable, "manage.py", "test", "chunkuploader"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=180,
            env=env
        )
        output = (proc.stdout + proc.stderr)
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": output[:8000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "test timeout"
        }


def run_metrics(_repo_path: Path):
    return {}


def evaluate_after():
    repo_path = ROOT / "repository_after"
    tests = run_tests(repo_path)
    metrics = run_metrics(repo_path)
    return {
        "tests": tests,
        "metrics": metrics
    }


def run_evaluation():
    run_id = str(uuid.uuid4())
    started_at = datetime.utcnow()

    before = {
        "tests": {
            "passed": False,
            "return_code": 0,
            "output": "skipped: no tests for repository_before"
        },
        "metrics": {}
    }
    after = evaluate_after()

    comparison = {
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": "After implementation passed correctness gate."
        if after["tests"]["passed"] else "After implementation failed correctness gate."
    }

    finished_at = datetime.utcnow()
    return {
        "run_id": run_id,
        "started_at": started_at.isoformat() + "Z",
        "finished_at": finished_at.isoformat() + "Z",
        "duration_seconds": (finished_at - started_at).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }


def main():
    REPORTS.mkdir(parents=True, exist_ok=True)
    try:
        report = run_evaluation()
        report_path = REPORTS / "report.json"
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 0 if report["success"] else 1
    except Exception as exc:
        error_report = {
            "run_id": str(uuid.uuid4()),
            "started_at": datetime.utcnow().isoformat() + "Z",
            "finished_at": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": 0.0,
            "environment": environment_info(),
            "before": {"tests": {"passed": False, "return_code": -1, "output": ""}, "metrics": {}},
            "after": {"tests": {"passed": False, "return_code": -1, "output": ""}, "metrics": {}},
            "comparison": {"passed_gate": False, "improvement_summary": "Evaluation failed."},
            "success": False,
            "error": str(exc)
        }
        report_path = REPORTS / "report.json"
        report_path.write_text(json.dumps(error_report, indent=2), encoding="utf-8")
        return 1


if __name__ == "__main__":
    sys.exit(main())
