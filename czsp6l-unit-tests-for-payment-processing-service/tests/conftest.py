from __future__ import annotations

import pytest
import sys


def pytest_addoption(parser):
    parser.addoption("--repo", action="store", default="after", help="Repository to test: before or after")


def get_compute_customer_report():
    repo = None
    for i, arg in enumerate(sys.argv):
        if arg == "--repo" and i + 1 < len(sys.argv):
            repo = sys.argv[i + 1]
            break
    
    if repo == "before":
        from repository_before import compute_customer_report
    else:
        from repository_after import compute_customer_report
    return compute_customer_report


@pytest.fixture
def report():
    return get_compute_customer_report()
