#!/usr/bin/env python3
"""Run tests and produce a JSON report under evaluation/YYYY-MM-DD/HH-MM-SS/report.json

This script runs `pytest` to produce a JUnit XML, parses the XML using the
standard library, and writes a JSON summary that follows the project-specific
report template.
"""
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
import platform
import socket


def iso_now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def run_pytest(junit_path):
    # Run pytest and output JUnit XML
    cmd = [sys.executable, "-m", "pytest", "-q", f"--junitxml={junit_path}", "tests"]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return proc.returncode, proc.stdout.decode("utf-8", errors="replace"), proc.stderr.decode(
        "utf-8", errors="replace"
    )


def parse_junit(junit_path):
    tree = ET.parse(junit_path)
    root = tree.getroot()

    tests = []
    total = passed = failed = errors = skipped = 0

    # junit xml may have <testsuites> or <testsuite> at root
    suites = []
    if root.tag == "testsuites":
        suites = list(root.findall("testsuite"))
    elif root.tag == "testsuite":
        suites = [root]

    for suite in suites:
        for case in suite.findall("testcase"):
            name = case.get("name")
            time_s = case.get("time") or "0"
            try:
                duration_ms = int(float(time_s) * 1000)
            except Exception:
                duration_ms = 0

            status = "passed"
            failure_messages = []
            if case.find("failure") is not None:
                status = "failed"
                failed += 1
                failure_messages.append((case.find("failure").text or "").strip())
            elif case.find("error") is not None:
                status = "error"
                errors += 1
                failure_messages.append((case.find("error").text or "").strip())
            elif case.find("skipped") is not None:
                status = "skipped"
                skipped += 1
            else:
                passed += 1

            total += 1

            tests.append({
                "name": name,
                "status": status,
                "duration": duration_ms,
                "failureMessages": failure_messages,
            })

    summary = {"total": total, "passed": passed, "failed": failed, "xfailed": 0, "errors": errors, "skipped": skipped}

    return tests, summary


def main():
    started_at = iso_now()
    run_id = str(uuid.uuid4())

    now = datetime.now()
    dir_base = now.strftime("%Y-%m-%d/%H-%M-%S")
    out_dir = os.path.join("evaluation", dir_base)
    os.makedirs(out_dir, exist_ok=True)

    junit_path = os.path.join(out_dir, "junit.xml")

    exit_code, stdout, stderr = run_pytest(junit_path)

    finished_at = iso_now()
    # compute duration in seconds as float
    started_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    finished_dt = datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
    duration_seconds = (finished_dt - started_dt).total_seconds()

    # parse junit if it exists
    tests = []
    summary = {"total": 0, "passed": 0, "failed": 0, "xfailed": 0, "errors": 0, "skipped": 0}
    if os.path.exists(junit_path):
        tests, summary = parse_junit(junit_path)

    success = exit_code == 0

    report = {
        "run_id": run_id,
        "started_at": started_at,
        "finished_at": finished_at,
        "duration_seconds": round(duration_seconds, 3),
        "success": success,
        "error": None if success else stderr.strip() or None,
        "environment": {
            "python_version": platform.python_version(),
            "platform": platform.platform(),
            "os": platform.system(),
            "architecture": platform.machine(),
            "hostname": socket.gethostname(),
        },
        "results": {
            "after": {
                "success": success,
                "exit_code": exit_code,
                "tests": tests,
                "summary": summary,
            },
            "comparison": {
                "after_tests_passed": success,
                "after_total": summary.get("total", 0),
                "after_passed": summary.get("passed", 0),
                "after_failed": summary.get("failed", 0),
                "after_xfailed": summary.get("xfailed", 0),
            },
        },
    }

    report_path = os.path.join(out_dir, "report.json")
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    # remove junit xml - not needed after report
    try:
        if os.path.exists(junit_path):
            os.remove(junit_path)
    except Exception:
        pass

    # echo path and exit with pytest's exit code
    print(f"Wrote report to: {report_path}")
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
def main():
    # TODO: implement evaluation logic
    print("Evaluation placeholder")


if __name__ == "__main__":
    main()
