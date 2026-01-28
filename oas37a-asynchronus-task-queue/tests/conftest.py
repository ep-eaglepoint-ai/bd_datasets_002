"""
Pytest configuration for async task queue tests.

Supports dynamic path loading via TARGET_REPOSITORY environment variable to test both
repository_before (expected to fail) and repository_after (expected to pass).
"""

import pytest
import sys
import os
import importlib.util
from pathlib import Path


@pytest.fixture(scope="session")
def repo_path():
    """Get the repository path from TARGET_REPOSITORY environment variable."""
    target_repo = os.environ.get("TARGET_REPOSITORY")
    
    if target_repo:
        # TARGET_REPOSITORY is set (e.g., "repository_before" or "repository_after")
        project_root = Path(__file__).parent.parent
        path = project_root / target_repo
    else:
        # Default to repository_after if not specified
        path = Path(__file__).parent.parent / "repository_after"
    
    return str(path)


@pytest.fixture(scope="session")
def queue_module(repo_path):
    """Dynamically load the queue module from the specified repository path."""
    queue_path = Path(repo_path) / "queue.py"
    
    if not queue_path.exists():
        pytest.fail(f"queue.py not found at {queue_path}")
    
    # Remove any previously loaded 'queue' module to ensure fresh load
    if "queue" in sys.modules:
        del sys.modules["queue"]
    
    # Load the module dynamically
    spec = importlib.util.spec_from_file_location("queue", queue_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["queue"] = module
    spec.loader.exec_module(module)
    
    return module


@pytest.fixture
def AsyncTaskQueue(queue_module):
    """Provide AsyncTaskQueue class from dynamically loaded module."""
    return queue_module.AsyncTaskQueue


@pytest.fixture
def Task(queue_module):
    """Provide Task class from dynamically loaded module."""
    return queue_module.Task


@pytest.fixture
def TaskStatus(queue_module):
    """Provide TaskStatus enum from dynamically loaded module."""
    return queue_module.TaskStatus


@pytest.fixture
def TaskResult(queue_module):
    """Provide TaskResult class from dynamically loaded module."""
    return queue_module.TaskResult


@pytest.fixture
def PriorityTaskQueue(queue_module):
    """Provide PriorityTaskQueue class from dynamically loaded module."""
    return queue_module.PriorityTaskQueue


@pytest.fixture
def RetryPolicy(queue_module):
    """Provide RetryPolicy class from dynamically loaded module."""
    return queue_module.RetryPolicy


@pytest.fixture
def ResultCache(queue_module):
    """Provide ResultCache class from dynamically loaded module."""
    return queue_module.ResultCache


@pytest.fixture
def event_loop():
    """Create event loop for async tests."""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
