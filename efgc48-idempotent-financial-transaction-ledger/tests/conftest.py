import pytest
import sys
import os

def pytest_addoption(parser):
    parser.addoption("--repo", action="store", default="after", help="Repository to test: before or after")

def pytest_configure(config):
    repo = config.getoption("--repo")
    repo_path = os.path.join(os.path.dirname(__file__), f"../repository_{repo}")
    sys.path.insert(0, repo_path)