import os
import pytest


def pytest_collection_modifyitems(config, items):
    py_path = os.environ.get("PYTHONPATH", "")
    target = None
    if "repository_before" in py_path:
        target = "repository_before"
    elif "repository_after" in py_path:
        target = "repository_after"

    if not target:
        return

    for item in items:
        path = str(item.fspath)
        if target == "repository_before" and "repository_after" in path:
            item.add_marker(pytest.mark.skip(reason="Skipping repository_after tests"))
        if target == "repository_after" and "repository_before" in path:
            item.add_marker(pytest.mark.skip(reason="Skipping repository_before tests"))
