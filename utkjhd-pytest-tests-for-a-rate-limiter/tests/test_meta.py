import pytest
from pathlib import Path

# Enable pytester plugin to run pytest inside pytest
pytest_plugins = ("pytester",)

# Directory where we stored the Broken/Correct implementations
IMPL_DIR = Path(__file__).resolve().parent / "resources" / "rate_limiter"

def _load_impl(filename: str) -> str:
    """Helper to read the python code from the resources folder."""
    file_path = IMPL_DIR / filename
    if not file_path.exists():
        pytest.fail(f"Resource file not found: {file_path}")
    return file_path.read_text()

@pytest.fixture
def user_suite_text() -> str:
    """Reads your clean test suite from repository_after."""
    suite_path = Path(__file__).resolve().parents[1] / "repository_after" / "rate_limiter_test.py"
    if not suite_path.exists():
        pytest.fail(f"User test suite not found: {suite_path}")
    return suite_path.read_text()

def _run_suite(pytester, suite_text, impl_code):
    """
    The Sandbox:
    1. Creates 'rate_limiter.py' containing the implementation (Good or Bad).
    2. Creates 'rate_limiter_test.py' containing YOUR test suite.
    3. Runs pytest in this isolated environment.
    """
    pytester.makepyfile(
        rate_limiter=impl_code,
        test_rate_limiter=suite_text
    )
    # Run pytest in the sandbox
    return pytester.runpytest("-v")

# --- META TEST CASES ---

def test_passes_against_correct_code(pytester, user_suite_text):
    """
    Scenario: The code is perfect.
    Expectation: Your test suite should PASS (Exit Code 0).
    """
    result = _run_suite(pytester, user_suite_text, _load_impl("correct.py"))
    
    # Assert exit code 0 (Success)
    if result.ret != 0:
        print("\n--- Output from failed run against CORRECT code ---")
        print(result.stdout.str())
        pytest.fail("Your test suite failed against the CORRECT implementation!")

def test_fails_against_infinite_allowance(pytester, user_suite_text):
    """
    Scenario: The Rate Limiter allows infinite requests (Bug).
    Expectation: Your test suite should FAIL (Exit Code != 0).
    """
    result = _run_suite(pytester, user_suite_text, _load_impl("broken_infinite.py"))
    
    if result.ret == 0:
        pytest.fail("Your suite PASSED against 'broken_infinite.py'. It should have caught the bug!")

def test_fails_against_broken_window_reset(pytester, user_suite_text):
    """
    Scenario: The Window never resets (Bug).
    Expectation: Your test suite should FAIL.
    """
    result = _run_suite(pytester, user_suite_text, _load_impl("broken_reset.py"))
    
    if result.ret == 0:
        pytest.fail("Your suite PASSED against 'broken_reset.py'. It should have caught the bug!")

def test_fails_against_broken_ttl(pytester, user_suite_text):
    """
    Scenario: TTL is always static/full window (Bug).
    Expectation: Your test suite should FAIL.
    """
    result = _run_suite(pytester, user_suite_text, _load_impl("broken_ttl.py"))
    
    if result.ret == 0:
        pytest.fail("Your suite PASSED against 'broken_ttl.py'. It should have caught the bug!")

def test_fails_against_broken_validation(pytester, user_suite_text):
    """
    Scenario: Input validation is removed (Bug).
    Expectation: Your test suite should FAIL.
    """
    result = _run_suite(pytester, user_suite_text, _load_impl("broken_validation.py"))
    
    if result.ret == 0:
        pytest.fail("Your suite PASSED against 'broken_validation.py'. It should have caught the bug!")