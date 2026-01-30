#!/usr/bin/env python3
"""Generate an evaluation report for this project.

Creates JSON report at `evaluation/YYYY-MM-DD/HH-MM-SS/report.json`.

This script runs the test suite (`pytest`) to collect results and emits a
report that follows the user's requested shape but with fields tailored to
this repository (connection-pool tests, stats, etc.).
"""
from __future__ import annotations

import json
import os
import platform
import socket
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime
from xml.etree import ElementTree as ET
from typing import Any, Dict, List


def iso_now() -> str:
    return datetime.utcnow().isoformat(timespec="milliseconds") + "Z"


def run_pytest_junit(junit_path: str) -> int:
    """Run pytest and write JUnit xml to junit_path. Returns exit code."""
    # Run pytest in the repository root; tests are in `tests/`.
    cmd = [sys.executable, "-m", "pytest", "-q", "--junitxml", junit_path, "tests"]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    # write pytest stdout/stderr to console for visibility
    sys.stdout.buffer.write(proc.stdout)
    sys.stderr.buffer.write(proc.stderr)
    return proc.returncode


def parse_junit(junit_path: str) -> Dict[str, Any]:
    """Parse JUnit XML and return test details and summary."""
    tree = ET.parse(junit_path)
    root = tree.getroot()

    tests: List[Dict[str, Any]] = []
    total = passed = failed = errors = skipped = 0

    # JUnit report may have <testsuite> or <testsuites>
    suites = []
    if root.tag == "testsuites":
        suites = list(root.findall("testsuite"))
    elif root.tag == "testsuite":
        suites = [root]

    for suite in suites:
        for case in suite.findall("testcase"):
            total += 1
            name = case.get("classname") or "" + "." + (case.get("name") or "")
            # time is seconds as string
            duration = float(case.get("time") or 0.0)
            failure_msgs: List[str] = []
            status = "passed"
            if case.find("failure") is not None:
                status = "failed"
                failed += 1
                for f in case.findall("failure"):
                    failure_msgs.append((f.text or "").strip())
            elif case.find("error") is not None:
                status = "error"
                errors += 1
                for e in case.findall("error"):
                    failure_msgs.append((e.text or "").strip())
            elif case.find("skipped") is not None:
                status = "skipped"
                skipped += 1
            else:
                passed += 1

            tests.append({
                "name": (case.get("classname") or "") + "." + (case.get("name") or ""),
                "status": status,
                "duration": duration,
                "failureMessages": failure_msgs,
            })

    summary = {
        "total": total,
        "passed": passed,
        "failed": failed,
        "xfailed": 0,
        "errors": errors,
        "skipped": skipped,
    }

    return {"tests": tests, "summary": summary}


def gather_environment() -> Dict[str, Any]:
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "architecture": platform.machine(),
        "hostname": socket.gethostname(),
    }


def main() -> int:
    run_id = str(uuid.uuid4())
    started_at = iso_now()
    start_ts = time.time()

    out_dir = datetime.utcnow().strftime("%Y-%m-%d/%H-%M-%S")
    base_dir = os.path.join("evaluation", out_dir)
    os.makedirs(base_dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        junit_path = os.path.join(td, "results.xml")
        exit_code = run_pytest_junit(junit_path)

        parsed = parse_junit(junit_path)

    finished_at = iso_now()
    duration_seconds = round(time.time() - start_ts, 3)

    success = exit_code == 0

    report: Dict[str, Any] = {
        "run_id": run_id,
        "started_at": started_at,
        "finished_at": finished_at,
        "duration_seconds": duration_seconds,
        "success": success,
        "error": None if success else "pytest reported failures",
        "environment": gather_environment(),
        "results": {
            "after": {
                "success": success,
                "exit_code": exit_code,
                "tests": parsed["tests"],
                "summary": parsed["summary"],
            },
            "comparison": {
                # minimal comparison metadata for now
                "after_tests_passed": parsed["summary"]["passed"] == parsed["summary"]["total"],
                "after_total": parsed["summary"]["total"],
                "after_passed": parsed["summary"]["passed"],
                "after_failed": parsed["summary"]["failed"],
                "after_xfailed": parsed["summary"].get("xfailed", 0),
            },
        },
    }

    report_path = os.path.join(base_dir, "report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Wrote report to: {report_path}")

    return 0 if success else 2


if __name__ == "__main__":
    raise SystemExit(main())
def main():
    # TODO: implement evaluation logic
    print("Evaluation placeholder")


if __name__ == "__main__":
    main()
