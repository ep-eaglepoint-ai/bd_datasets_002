#!/usr/bin/env python3
"""
Run meta-tests with configurable exit behavior.

For repository_before, test failures are expected, so we exit 0.
For repository_after, test failures are unexpected, so we exit with pytest's code.
"""
import os
import sys
import subprocess

repo_path = os.environ.get("REPO_PATH", "repository_after")

result = subprocess.run(
    [sys.executable, "-m", "pytest", "tests/test_meta.py", "-v"],
    env={**os.environ, "REPO_PATH": repo_path}
)

if repo_path == "repository_before":
    print(f"\nNote: repository_before tests exited with code {result.returncode} (expected to fail)")
    sys.exit(0)

sys.exit(result.returncode)
