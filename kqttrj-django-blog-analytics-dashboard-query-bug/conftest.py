"""
Pytest configuration for Django Blog Analytics tests.
Provides summary-only output matching Jest reporter style.
"""

import os
import sys
import time
import django
import pytest

# Determine which repository to test based on environment variable
REPO = os.environ.get("REPO", "repository_after")

# Check if running from evaluation script
EVALUATION_MODE = os.environ.get("EVALUATION_MODE", "0") == "1"


def pytest_configure():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
    django.setup()


# Global counters (only used when not in evaluation mode)
_passed = 0
_failed = 0
_total = 0
_start_time = None


def pytest_sessionstart(session):
    global _start_time
    _start_time = time.time()


def pytest_runtest_logreport(report):
    global _passed, _failed, _total
    if report.when == "call":
        _total += 1
        if report.passed:
            _passed += 1
        elif report.failed:
            _failed += 1


def pytest_sessionfinish(session, exitstatus):
    if EVALUATION_MODE:
        return

    global _passed, _failed, _total, _start_time
    elapsed = time.time() - _start_time

    print("")
    if _failed > 0:
        print(f"Test Suites: 1 failed, 1 total")
    else:
        print(f"Test Suites: 1 passed, 1 total")

    tests_status = ""
    if _failed > 0:
        tests_status += f"{_failed} failed, "
    if _passed > 0:
        tests_status += f"{_passed} passed, "
    tests_status += f"{_total} total"

    print(f"Tests:       {tests_status}")
    print(f"Snapshots:   0 total")
    print(f"Time:        {elapsed:.3f} s")


if not EVALUATION_MODE:
    # Only register output-suppressing hooks when NOT in evaluation mode
    def pytest_report_collectionfinish(config, start_path, startdir, items):
        return []

    def pytest_report_teststatus(report, config):
        if report.when == "call":
            return "", "", ""
        return "", "", ""
