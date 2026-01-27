import os
import pytest


def _target_repo() -> str | None:
    py_path = os.environ.get("PYTHONPATH", "")
    if "repository_before" in py_path:
        return "repository_before"
    if "repository_after" in py_path:
        return "repository_after"
    return None


def pytest_ignore_collect(collection_path, config):
    target = _target_repo()
    if not target:
        return False
    path_str = str(collection_path)
    if target == "repository_before" and "repository_after" in path_str:
        return True
    if target == "repository_after" and "repository_before" in path_str:
        return True
    return False


def pytest_collection_modifyitems(config, items):
    target = _target_repo()

    if not target:
        return

    for item in items:
        path = str(item.fspath)
        if target == "repository_before" and "repository_after" in path:
            item.add_marker(pytest.mark.skip(reason="Skipping repository_after tests"))
        if target == "repository_after" and "repository_before" in path:
            item.add_marker(pytest.mark.skip(reason="Skipping repository_before tests"))
