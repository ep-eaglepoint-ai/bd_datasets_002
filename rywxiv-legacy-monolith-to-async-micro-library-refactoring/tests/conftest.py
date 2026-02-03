"""
Pytest configuration for repo filtering.

Tests are designed to:
- Run SAME tests on both repository_before/ and repository_after/
- repository_before will FAIL most tests (has bugs)
- repository_after will PASS all tests (bugs fixed)

Supports both --repo command line option and REPO_TEST_REPO environment variable.
"""

import pytest
import sys
import os
from pathlib import Path


def pytest_addoption(parser):
    """Add --repo option to pytest."""
    parser.addoption(
        "--repo",
        action="store",
        default=None,
        choices=("before", "after"),
        help="Which repository to test: before or after"
    )


@pytest.fixture
def repo(request):
    """Fixture to get which repository to test."""
    # Check command line option first
    repo_value = request.config.getoption("--repo")
    if repo_value:
        return repo_value
    
    # Fall back to environment variable
    return os.environ.get("REPO_TEST_REPO", "after")


@pytest.fixture
def market_module(request):
    """
    Fixture that provides the appropriate market_sentiment module.
    
    Tests should use this fixture instead of direct imports.
    This allows the same tests to run on both repositories.
    """
    repo = request.config.getoption("--repo")
    if not repo:
        repo = os.environ.get("REPO_TEST_REPO", "after")
    
    if repo == "before":
        sys.path.insert(0, str(Path(__file__).parent.parent / "repository_before"))
        try:
            from repository_before import market_sentiment_before as module
            return module
        except ImportError:
            from repository_before import market_sentiment as module
            return module
    else:  # after
        sys.path.insert(0, str(Path(__file__).parent.parent / "repository_after"))
        from repository_after import market_sentiment as module
        return module


@pytest.fixture
def market_module_after():
    """Always get the refactored after module."""
    sys.path.insert(0, str(Path(__file__).parent.parent / "repository_after"))
    from repository_after import market_sentiment as module
    return module


@pytest.fixture
def is_before_repo(request):
    """Check if we're testing the before repository."""
    repo = request.config.getoption("--repo")
    if not repo:
        repo = os.environ.get("REPO_TEST_REPO", "after")
    return repo == "before"


def pytest_collection_modifyitems(config, items):
    """
    Filter tests based on --repo option or environment variable.
    
    When --repo before: tests will fail due to bugs
    When --repo after: tests will pass (bugs fixed)
    """
    # No filtering - all tests run on the specified repo
    pass
