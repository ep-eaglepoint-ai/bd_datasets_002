
import os
import sys
import subprocess
import pytest
from pathlib import Path

# Cache results to avoid re-running tests multiple times
_TEST_RESULTS_CACHE = {}

def run_repo_tests(repo_dir_name, extra_args=None):
    """Utility to run pytest on a specific repository and return results."""
    project_root = Path(__file__).parent.parent
    repo_path = project_root / repo_dir_name
    test_file = repo_path / "test_cache.py"
    
    if not test_file.exists():
        return None, "Test file not found"

    cmd = [sys.executable, "-m", "pytest", str(test_file), "-v"]
    if extra_args:
        cmd.extend(extra_args)
        
    env = os.environ.copy()
    env["PYTHONPATH"] = str(repo_path)
    
    result = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=str(project_root))
    return result.stdout, result.stderr

def get_outcomes():
    repo_dir = os.environ.get('TEST_REPO_DIR', 'repository_after')
    if repo_dir not in _TEST_RESULTS_CACHE:
        stdout, stderr = run_repo_tests(repo_dir, extra_args=["--cov=lru_ttl_cache", "--cov-report=term-missing"])
        
        outcomes = {}
        if stdout:
            for line in stdout.splitlines():
                if "::" in line and (" PASSED" in line or " FAILED" in line or " ERROR" in line):
                    parts = line.split()
                    if len(parts) >= 2:
                        nodeid = parts[0]
                        status = parts[1]
                        test_name = nodeid.split("::")[-1]
                        outcomes[test_name] = status
        
        coverage = None
        if stdout:
            for line in stdout.splitlines():
                if "TOTAL" in line.upper():  # Case-insensitive
                    parts = line.split()
                    for part in parts:
                        if "%" in part:
                            coverage = part
                            break
        
        _TEST_RESULTS_CACHE[repo_dir] = {
            "outcomes": outcomes,
            "coverage": coverage,
            "stdout": stdout,
            "stderr": stderr
        }
    return _TEST_RESULTS_CACHE[repo_dir]

def assert_test_passed(test_name):
    data = get_outcomes()
    outcomes = data["outcomes"]
    assert test_name in outcomes, f"Test '{test_name}' not found in suite!"
    assert outcomes[test_name] in ("PASSED", "PASSED "), f"Test '{test_name}' failed! Status: {outcomes[test_name]}\nOutput:\n{data['stdout']}"

# Meta Tests
def test_meta_prune_expired_empty(): assert_test_passed("test_prune_expired_empty")
def test_meta_put_same_key_multiple_times(): assert_test_passed("test_put_same_key_multiple_times")
def test_meta_capacity_one_edge_case(): assert_test_passed("test_capacity_one_edge_case")
def test_meta_expired_item_doesnt_count_toward_capacity(): assert_test_passed("test_expired_item_doesnt_count_toward_capacity")
def test_meta_mixed_expired_and_valid_eviction(): assert_test_passed("test_mixed_expired_and_valid_eviction")
def test_meta_put_after_prune(): assert_test_passed("test_put_after_prune")
def test_meta_expiry_map_consistency(): assert_test_passed("test_expiry_map_consistency")
def test_meta_very_short_ttl(): assert_test_passed("test_very_short_ttl")
def test_meta_alternating_put_get_operations(): assert_test_passed("test_alternating_put_get_operations")
def test_meta_requirement_lru_ordering(): assert_test_passed("test_requirement_lru_ordering")
def test_meta_requirement_atomic_update(): assert_test_passed("test_requirement_atomic_update")
def test_meta_requirement_prune_expired_count(): assert_test_passed("test_requirement_prune_expired_count")
def test_meta_requirement_zero_capacity(): assert_test_passed("test_requirement_zero_capacity")
def test_meta_requirement_negative_capacity(): assert_test_passed("test_requirement_negative_capacity")
def test_meta_requirement_zero_ttl(): assert_test_passed("test_requirement_zero_ttl")
def test_meta_requirement_negative_ttl(): assert_test_passed("test_requirement_negative_ttl")
def test_meta_explicit_delete_non_existent(): assert_test_passed("test_explicit_delete_non_existent")
def test_meta_requirement_high_load(): assert_test_passed("test_requirement_high_load")
def test_meta_internal_delete_usage_get(): assert_test_passed("test_internal_delete_usage_get")

def test_meta_expires_exactly_at_capacity_limit():
    assert_test_passed("test_expires_exactly_at_capacity_limit")

def test_meta_code_coverage():
    data = get_outcomes()
    assert data["coverage"] is not None, f"Coverage extraction failed. Output:\n{data['stdout']}"
    assert data["coverage"] in ("100%", "100.0%"), f"Coverage is {data['coverage']}, expected 100%"
