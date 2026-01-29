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
REPORTS_DIR = ROOT / "evaluation" / "reports"
OUTPUT_LIMIT = 8000
TIMEOUT_SECONDS = 120

REQUIREMENTS = [
    {
        "id": 1,
        "description": "Test that valid customer rows are inserted correctly.",
        "tests": ["test_valid_customer_inserted"],
    },
    {
        "id": 2,
        "description": "Test that rows with missing or blank required fields are skipped as invalid.",
        "tests": ["test_invalid_row_skipped"],
    },
    {
        "id": 3,
        "description": "Test that duplicate emails within the same CSV file are skipped.",
        "tests": ["test_duplicates_within_csv_skipped"],
    },
    {
        "id": 4,
        "description": "Test that emails already existing in the repository are skipped as duplicates.",
        "tests": ["test_existing_emails_skipped_as_duplicate"],
    },
    {
        "id": 5,
        "description": "Assert that all fields in ImportStats are exactly correct.",
        "tests": ["test_importstats_all_fields_exact"],
    },
    {
        "id": 6,
        "description": "Verify the number of repository method calls.",
        "tests": ["test_valid_customer_inserted", "test_duplicates_within_csv_skipped"],
    },
    {
        "id": 7,
        "description": "Verify the arguments passed to repository insert calls.",
        "tests": ["test_valid_customer_inserted", "test_mixed_valid_invalid_duplicates"],
    },
    {
        "id": 8,
        "description": "Include edge cases such as empty CSV input.",
        "tests": ["test_empty_csv"],
    },
    {
        "id": 9,
        "description": "Include a header-only CSV with no data rows.",
        "tests": ["test_header_only_csv"],
    },
    {
        "id": 10,
        "description": "Include CSV input with a mix of valid, invalid, and duplicate rows.",
        "tests": ["test_mixed_valid_invalid_duplicates"],
    },
    {
        "id": 11,
        "description": "Do not modify the production code.",
        "tests": [],
        "manual": True,
    },
    {
        "id": 12,
        "description": "Do not use the file system; use the provided CSV text only.",
        "tests": [],
        "manual": True,
    },
    {
        "id": 13,
        "description": "Use mocks or fakes for CustomerRepository.",
        "tests": ["test_valid_customer_inserted", "test_invalid_row_skipped"],
    },
    {
        "id": 14,
        "description": "Ensure tests rely only on documented behavior of DictReader.",
        "tests": [],
        "manual": True,
    },
]


def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
    }


def run_tests(repo_name: str):
    env = os.environ.copy()
    env["REPO_PATH"] = repo_name

    try:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        json_report_path = REPORTS_DIR / f"pytest_{repo_name}.json"
        proc, output = _run_pytest(
            [
                sys.executable,
                "-m",
                "pytest",
                "tests",
                "-vv",
                "--json-report",
                f"--json-report-file={json_report_path}",
            ],
            env,
        )

        if proc.returncode == 4 and "unrecognized arguments: --json-report" in output:
            proc, output = _run_pytest(
                [sys.executable, "-m", "pytest", "tests", "-vv"],
                env,
            )
            outcomes = _parse_test_outcomes_from_stdout(output)
        else:
            outcomes = _parse_test_outcomes(json_report_path)
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": output[:OUTPUT_LIMIT],
            "outcomes": outcomes,
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "pytest timeout",
            "outcomes": {},
        }


def run_metrics(repo_path: Path):
    return {}


def _run_pytest(cmd, env):
    proc = subprocess.run(
        cmd,
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=TIMEOUT_SECONDS,
    )
    output = (proc.stdout + proc.stderr)
    return proc, output


def _parse_test_outcomes(report_path: Path):
    if not report_path.exists():
        return {}
    try:
        with open(report_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}

    outcomes = {}
    for test in data.get("tests", []):
        nodeid = test.get("nodeid")
        outcome = test.get("outcome")
        if nodeid and outcome:
            outcomes[nodeid] = outcome
    return outcomes


def _parse_test_outcomes_from_stdout(output: str):
    outcomes = {}
    for line in output.splitlines():
        line = line.strip()
        if "::" not in line:
            continue
        parts = line.rsplit(" ", 1)
        if len(parts) != 2:
            continue
        nodeid, status = parts
        status_upper = status.upper()
        if status_upper in {"PASSED", "FAILED", "SKIPPED", "XFAIL", "XPASS", "ERROR"}:
            outcomes[nodeid] = status_upper.lower()
    return outcomes


def _summarize_requirements(test_outcomes: dict):
    results = []
    for req in REQUIREMENTS:
        tests = req["tests"]
        if not tests:
            results.append({
                "id": req["id"],
                "description": req["description"],
                "tests": [],
                "passed": None,
                "manual": req.get("manual", False),
            })
            continue
        matched = {}
        for nodeid, outcome in test_outcomes.items():
            test_name = nodeid.split("::")[-1]
            if test_name in tests:
                matched[test_name] = outcome
        passed = bool(matched) and all(outcome == "passed" for outcome in matched.values())
        results.append({
            "id": req["id"],
            "description": req["description"],
            "tests": tests,
            "passed": passed,
            "outcomes": matched,
            "manual": req.get("manual", False),
        })
    return results


def evaluate(repo_name: str):
    repo_path = ROOT / repo_name
    tests = run_tests(repo_name)
    metrics = run_metrics(repo_path)
    return {
        "tests": tests,
        "metrics": metrics,
        "requirements": _summarize_requirements(tests.get("outcomes", {})),
    }


def run_evaluation():
    run_id = str(uuid.uuid4())
    started_at = datetime.utcnow()

    before = evaluate("repository_before")
    after = evaluate("repository_after")

    passed_gate = after["tests"]["passed"]
    comparison = {
        "passed_gate": passed_gate,
        "improvement_summary": "After implementation passed correctness checks." if passed_gate else "After implementation failed correctness checks.",
    }

    finished_at = datetime.utcnow()

    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat() + "Z",
        "finished_at": finished_at.isoformat() + "Z",
        "duration_seconds": (finished_at - started_at).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": passed_gate,
        "error": None if passed_gate else "One or more tests failed in repository_after",
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"report_{started_at.strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report


def main():
    report = run_evaluation()
    return 0 if report.get("success") else 1


if __name__ == "__main__":
    sys.exit(main())
