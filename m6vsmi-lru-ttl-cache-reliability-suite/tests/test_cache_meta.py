
import os
import sys
import subprocess
import pytest
from pathlib import Path

def run_repo_tests(repo_dir_name):
    """Utility to run pytest on a specific repository and return results."""
    project_root = Path(__file__).parent.parent
    repo_path = project_root / repo_dir_name
    test_file = repo_path / "test_cache.py"
    
    if not test_file.exists():
        return None, "Test file not found"

    cmd = [sys.executable, "-m", "pytest", str(test_file), "-v"]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(repo_path)
    
    # Ensure current dir is project root so relative imports in repo work if needed
    result = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=str(project_root))
    return result.stdout, result.stderr

def parse_outcomes(stdout):
    """Parse pytest verbose output for test outcomes."""
    outcomes = {}
    if not stdout: return outcomes
    for line in stdout.splitlines():
        if "::" in line and (" PASSED" in line or " FAILED" in line or " ERROR" in line):
            parts = line.split()
            if len(parts) >= 2:
                nodeid = parts[0]
                status = parts[1]
                test_name = nodeid.split("::")[-1]
                outcomes[test_name] = status
    return outcomes

def test_meta_test_file_availability():
    """Meta-test: Verify that 'test_cache.py' exists in the selected repository."""
    repo_dir = os.environ.get('TEST_REPO_DIR', 'repository_after')
    project_root = Path(__file__).parent.parent
    test_file = project_root / repo_dir / "test_cache.py"
    assert test_file.exists(), f"Configuration Error: {repo_dir}/test_cache.py is missing!"

def test_meta_detects_buggy_zero_capacity():
    """Meta-test: Verify that the implementation's bugs are correctly identified."""
    repo_dir = os.environ.get('TEST_REPO_DIR', 'repository_after')
    stdout, _ = run_repo_tests(repo_dir)
    outcomes = parse_outcomes(stdout)
    
    # This test is expected to fail on the current implementation (it crashes with KeyError)
    assert outcomes.get("test_requirement_zero_capacity") == "FAILED", \
        "The test suite failed to catch the zero-capacity bug (or the test didn't run)!"

def test_meta_verifies_core_requirements_pass():
    """Meta-test: Verify that the test suite correctly passes for working features."""
    repo_dir = os.environ.get('TEST_REPO_DIR', 'repository_after')
    stdout, _ = run_repo_tests(repo_dir)
    outcomes = parse_outcomes(stdout)
    
    # Core features that are implemented correctly
    required_passes = [
        "test_requirement_lru_ordering",
        "test_requirement_atomic_update",
        "test_requirement_prune_expired_count",
        "test_requirement_high_load",
        "test_very_short_ttl",  # stale read
        "test_requirement_get_non_existent_no_lru_impact"
    ]
    
    for test in required_passes:
        assert outcomes.get(test) == "PASSED", f"Core requirement test {test} failed or was not run!"
