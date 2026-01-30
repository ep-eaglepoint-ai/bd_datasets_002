import os
import subprocess
import sys

# Determine absolute paths
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEFORE_PATH = os.path.join(REPO_ROOT, "repository_before")
AFTER_PATH = os.path.join(REPO_ROOT, "repository_after")
# Tests are now located in repository_after/tests
TESTS_PATH = os.path.join(REPO_ROOT, "repository_after", "tests")

def run_tests_with_env(python_path):
    """
    Runs pytest on the 'tests' directory with a specific PYTHONPATH.
    Returns the subprocess.CompletedProcess object.
    """
    env = os.environ.copy()
    # Explicitly set PYTHONPATH to ONLY the target path to prevent contamination
    # from the host shell (e.g. if the user has repository_after in their path)
    env["PYTHONPATH"] = str(python_path)
    
    # We are targeting repository_after/tests, so we don't need to recursively ignore anything
    # in the root tests/ folder (test_lifecycle.py is in root/tests, but we are running root/repository_after/tests)
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "-q", TESTS_PATH],
        env=env,
        capture_output=True,
        text=True
    )
    return result

def test_repository_before_fails():
    """
    repository_before must FAIL the tests logic.
    """
    print(f"Testing repository_before at: {BEFORE_PATH}")
    result = run_tests_with_env(BEFORE_PATH)
    
    print(assert_fail_msg := f"repository_before tests should have FAILED.\nOutput: {result.stdout}\nError: {result.stderr}")
    
    assert result.returncode != 0, assert_fail_msg
    # Confirm it failed for the right reason (Backend not found)
    assert "Backend application not found" in result.stdout or "Backend application not found" in result.stderr

def test_repository_after_passes():
    """
    repository_after must PASS all tests.
    """
    print(f"Testing repository_after at: {AFTER_PATH}")
    result = run_tests_with_env(AFTER_PATH)
    
    print(assert_pass_msg := f"repository_after tests should have PASSED.\nOutput: {result.stdout}\nError: {result.stderr}")
    
    assert result.returncode == 0, assert_pass_msg
