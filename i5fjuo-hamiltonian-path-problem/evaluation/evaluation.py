#!/usr/bin/env python3
"""
Evaluation runner per Trainer & Evaluator Standard.
Compares repository_before vs repository_after; writes report JSON.
Reports: evaluation/reports/yy-mm-dd/time-sec/report.json
"""

from __future__ import annotations

import json
import platform
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

OUTPUT_TRUNCATE = 8000


def _utc_z(dt: datetime) -> str:
    s = dt.isoformat()
    return s.replace("+00:00", "Z") if s.endswith("+00:00") else s + "Z"


def environment_info() -> dict:
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
    }


def _run_tests_impl() -> dict:
    """Run unittest on tests.test (repository_after)."""
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "unittest", "tests.test", "-v"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": out[:OUTPUT_TRUNCATE],
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "unittest timeout",
        }


def run_tests_before() -> dict:
    """Baseline empty; no tests run."""
    return {
        "passed": False,
        "return_code": 1,
        "output": "Baseline empty; no tests run.",
    }


def run_tests_after() -> dict:
    """Run correctness tests on repository_after."""
    return _run_tests_impl()


def run_metrics(repo_path: Path) -> dict:
    """Optional task metrics. Same logic for before & after."""
    return {}


def evaluate(repo_name: str) -> dict:
    repo_path = ROOT / repo_name
    if repo_name == "repository_before":
        tests = run_tests_before()
    else:
        tests = run_tests_after()
    metrics = run_metrics(repo_path)
    return {"tests": tests, "metrics": metrics}


def run_evaluation() -> dict:
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    before = evaluate("repository_before")
    after = evaluate("repository_after")
    passed_gate = after["tests"]["passed"]
    improvement_summary = (
        "After implementation passed correctness tests."
        if passed_gate
        else "After implementation failed correctness tests."
    )
    comparison = {
        "passed_gate": passed_gate,
        "improvement_summary": improvement_summary,
    }
    end = datetime.now(timezone.utc)
    return {
        "run_id": run_id,
        "started_at": _utc_z(start),
        "finished_at": _utc_z(end),
        "duration_seconds": (end - start).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None,
    }


def main() -> int:
    REPORTS.mkdir(parents=True, exist_ok=True)
    try:
        report = run_evaluation()
    except Exception as e:
        now = datetime.now(timezone.utc)
        report = {
            "run_id": str(uuid.uuid4()),
            "started_at": _utc_z(now),
            "finished_at": None,
            "duration_seconds": None,
            "environment": environment_info(),
            "before": None,
            "after": None,
            "comparison": None,
            "success": False,
            "error": str(e),
        }
    yy_mm_dd = datetime.now().strftime("%y-%m-%d")
    time_sec = str(int(time.time()))
    report_dir = REPORTS / yy_mm_dd / time_sec
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "report.json"
    dump = json.dumps(report, indent=2)
    report_path.write_text(dump, encoding="utf-8")
    print(f"Report written to {report_path}")
    if report.get("comparison"):
        comp = report["comparison"]
        print(f"passed_gate={comp['passed_gate']} — {comp['improvement_summary']}")
    else:
        print(f"success={report.get('success')} error={report.get('error')}")
    return 0 if report.get("success") else 1


if __name__ == "__main__":
    sys.exit(main())
