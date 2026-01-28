#!/usr/bin/env python3
import json
import os
import platform
import re
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"


def generate_run_id() -> str:
    return uuid.uuid4().hex[:8]


def get_git_info():
    git_info = {"git_commit": "unknown", "git_branch": "unknown"}
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            git_info["git_commit"] = result.stdout.strip()[:8]
    except Exception:
        pass

    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            git_info["git_branch"] = result.stdout.strip()
    except Exception:
        pass

    return git_info


def get_environment_info():
    git_info = get_git_info()
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "hostname": platform.node(),
        "git_commit": git_info["git_commit"],
        "git_branch": git_info["git_branch"],
    }


def parse_pytest_verbose_output(output: str):
    tests = []
    lines = output.split("\n")
    for line in lines:
        line_stripped = line.strip()
        if "::" not in line_stripped:
            continue

        outcome = None
        if " PASSED" in line_stripped:
            outcome = "passed"
        elif " FAILED" in line_stripped:
            outcome = "failed"
        elif " ERROR" in line_stripped:
            outcome = "error"
        elif " SKIPPED" in line_stripped:
            outcome = "skipped"

        if not outcome:
            continue

        nodeid = line_stripped
        for status_word in [" PASSED", " FAILED", " ERROR", " SKIPPED"]:
            if status_word in line_stripped:
                nodeid = line_stripped.split(status_word)[0].strip()
                break

        tests.append(
            {
                "nodeid": nodeid,
                "name": nodeid.split("::")[-1] if "::" in nodeid else nodeid,
                "outcome": outcome,
            }
        )
    return tests


def parse_pytest_summary_counts(output: str):
    summary = {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0}
    lines = output.split("\n")
    for line in lines:
        line_stripped = line.strip().lower()
        if "passed" in line_stripped or "failed" in line_stripped or "error" in line_stripped:
            matches = re.findall(r"(\d+)\s+(passed|failed|errors?|skipped)", line_stripped)
            for count_str, label in matches:
                count = int(count_str)
                if label == "passed":
                    summary["passed"] = count
                elif label == "failed":
                    summary["failed"] = count
                elif label.startswith("error"):
                    summary["errors"] = count
                elif label == "skipped":
                    summary["skipped"] = count
    summary["total"] = sum(
        summary[key] for key in ["passed", "failed", "errors", "skipped"]
    )
    return summary


def run_pytest_with_pythonpath(pythonpath: str, tests_path: Path, label: str):
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        str(tests_path),
        "-v",
        "--tb=short",
    ]

    env = os.environ.copy()
    env["PYTHONPATH"] = pythonpath
    env["DJANGO_SETTINGS_MODULE"] = "resumable_uploads.settings"

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(ROOT),
            env=env,
            timeout=180,
        )

        stdout = result.stdout
        stderr = result.stderr
        combined_output = f"{stdout}\n{stderr}"

        tests = parse_pytest_verbose_output(combined_output)
        passed = sum(1 for t in tests if t.get("outcome") == "passed")
        failed = sum(1 for t in tests if t.get("outcome") == "failed")
        errors = sum(1 for t in tests if t.get("outcome") == "error")
        skipped = sum(1 for t in tests if t.get("outcome") == "skipped")

        summary = {
            "total": len(tests),
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "skipped": skipped,
        }
        if summary["total"] == 0:
            summary = parse_pytest_summary_counts(combined_output)

        return {
            "label": label,
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "tests": tests,
            "summary": summary,
            "stdout": stdout[-3000:] if len(stdout) > 3000 else stdout,
            "stderr": stderr[-1000:] if len(stderr) > 1000 else stderr,
        }
    except subprocess.TimeoutExpired:
        return {
            "label": label,
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"error": "Test execution timed out"},
            "stdout": "",
            "stderr": "",
        }
    except Exception as exc:
        return {
            "label": label,
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"error": str(exc)},
            "stdout": "",
            "stderr": "",
        }


def run_evaluation():
    run_id = generate_run_id()
    started_at = datetime.utcnow()

    before = {
        "tests": {
            "success": False,
            "exit_code": 0,
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
            "stdout": "",
            "stderr": "",
            "tests": [],
            "label": "before (repository_before)",
        },
        "metrics": {},
    }

    after_tests_path = ROOT / "repository_after" / "chunkuploader" / "test_chunkuploader_pytest.py"
    if not after_tests_path.exists():
        after_tests_path = ROOT / "repository_after" / "chunkuploader"

    after = {
        "tests": run_pytest_with_pythonpath(
            str(ROOT / "repository_after"),
            after_tests_path,
            "after (repository_after)",
        ),
        "metrics": {},
    }

    comparison = {
        "passed_gate": after["tests"]["success"],
        "improvement_summary": "After implementation passed correctness gate."
        if after["tests"]["success"]
        else "After implementation failed correctness gate.",
        "after_total": after["tests"]["summary"].get("total", 0),
        "after_passed": after["tests"]["summary"].get("passed", 0),
        "after_failed": after["tests"]["summary"].get("failed", 0),
    }

    finished_at = datetime.utcnow()
    return {
        "run_id": run_id,
        "started_at": started_at.isoformat() + "Z",
        "finished_at": finished_at.isoformat() + "Z",
        "duration_seconds": (finished_at - started_at).total_seconds(),
        "environment": get_environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None,
    }


def main():
    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / "report.json"
    try:
        report = run_evaluation()
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 0 if report["success"] else 1
    except Exception as exc:
        error_report = {
            "run_id": generate_run_id(),
            "started_at": datetime.utcnow().isoformat() + "Z",
            "finished_at": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": 0.0,
            "environment": get_environment_info(),
            "before": {"tests": {"success": False, "exit_code": -1}, "metrics": {}},
            "after": {"tests": {"success": False, "exit_code": -1}, "metrics": {}},
            "comparison": {"passed_gate": False, "improvement_summary": "Evaluation failed."},
            "success": False,
            "error": str(exc),
        }
        report_path.write_text(json.dumps(error_report, indent=2), encoding="utf-8")
        return 1


if __name__ == "__main__":
    sys.exit(main())
