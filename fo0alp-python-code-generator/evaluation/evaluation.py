#!/usr/bin/env python3
import sys
import json
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "evaluation" / "reports"

# Map repo name to pytest -k filter
REPO_TO_K = {"repository_before": "before", "repository_after": "after"}


def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
    }


def run_tests(mode: str) -> dict:
    """Run pytest with -k mode (before | after). Returns tests dict for report."""
    try:
        proc = subprocess.run(
            ["python", "-m", "pytest", "tests", "-q", "-k", mode],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120,
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": output[:8000],
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "pytest timeout (120s)",
        }


def run_metrics(repo_path: Path) -> dict:
    """Optional – implement if task needs numeric metrics."""
    return {}


def evaluate(repo_name: str) -> dict:
    repo_path = ROOT / repo_name
    mode = REPO_TO_K.get(repo_name, repo_name)
    tests = run_tests(mode)
    metrics = run_metrics(repo_path)
    return {"tests": tests, "metrics": metrics}


def run_evaluation() -> dict:
    run_id = str(uuid.uuid4())
    start = datetime.utcnow()

    before = evaluate("repository_before")
    after = evaluate("repository_after")

    passed_gate = after["tests"]["passed"]
    if passed_gate and not before["tests"]["passed"]:
        improvement_summary = "After implementation passed correctness checks; before failed."
    elif passed_gate and before["tests"]["passed"]:
        improvement_summary = "Before and after both passed correctness checks."
    elif not passed_gate:
        improvement_summary = "After implementation did not pass correctness checks."

    comparison = {
        "passed_gate": passed_gate,
        "improvement_summary": improvement_summary,
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
        "error": None,
    }


def main() -> int:
    try:
        report = run_evaluation()
    except Exception as e:
        report = {
            "run_id": str(uuid.uuid4()),
            "started_at": datetime.utcnow().isoformat() + "Z",
            "finished_at": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": 0.0,
            "environment": environment_info(),
            "before": {"tests": {"passed": False, "return_code": -1, "output": ""}, "metrics": {}},
            "after": {"tests": {"passed": False, "return_code": -1, "output": ""}, "metrics": {}},
            "comparison": {"passed_gate": False, "improvement_summary": "Evaluation crashed."},
            "success": False,
            "error": str(e),
        }

    # Path: evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json
    finished = report["finished_at"]
    date_part = finished[:10]  # YYYY-MM-DD
    time_part = finished[11:19].replace(":", "-")  # HH-MM-SS
    report_dir = REPORTS / date_part / time_part
    report_dir.mkdir(parents=True, exist_ok=True)
    path = report_dir / "report.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Report written to {path}")
    return 0 if report["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
