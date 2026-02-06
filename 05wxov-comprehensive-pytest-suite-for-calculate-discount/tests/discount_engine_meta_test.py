import pytest
import re
from pathlib import Path

pytest_plugins = ("pytester",)

RESOURCES = Path(__file__).parent / "resources"

@pytest.fixture
def suite_code():
    """
    Reads the test suite from repository_after.
    
    CRITICAL: It replaces the import path to ensure the test suite checks 
    the local mutated code ('src.discount_engine') instead of the 
    static file in 'repository_before'.
    """
    # 1. Find the project root dynamically to avoid FileNotFoundError
    project_root = Path(__file__).resolve().parents[1]
    path = project_root / "repository_after" / "src" / "test_discount_engine.py"
    
    if not path.exists():
        pytest.fail(f"Test suite not found at: {path}")

    content = path.read_text()
    
    new_content = re.sub(
        r"from\s+repository_before\.src\.discount_engine\s+import", 
        "from src.discount_engine import", 
        content
    )
    
    if new_content == content:
        pytest.fail("Could not rewrite imports! The test suite must import from 'repository_before.src.discount_engine'.")

    return new_content

def run_meta(pytester, impl_filename, suite_code):
    """
    Sets up the sandbox and runs the test suite.
    """
    print(f"\n\n>>> [META] Injecting Implementation: {impl_filename}")
    
    impl_content = (RESOURCES / impl_filename).read_text()
    
    pytester.makepyfile(
        **{
            "src/__init__.py": "",
            "src/discount_engine.py": impl_content,
            "src/test_discount_engine.py": suite_code,
        }
    )
    
    return pytester.runpytest("-v", "-rr")

def verify_bug_detection(result, mutant_name):
    """
    Helper to assert that the test suite failed (caught the bug).
    If it passed (missed the bug), it prints the logs for debugging.
    """
    outcomes = result.parseoutcomes()
    failed = outcomes.get("failed", 0)
    passed = outcomes.get("passed", 0)
    
    print(f">>> [META] Results for {mutant_name}: {passed} passed, {failed} failed")

    if failed >= 1:
        print(f">>> [META] SUCCESS: The test suite correctly detected the bug in {mutant_name}.")
    else:
        print(f"\n!!! [META FAILURE] The test suite FAILED to detect the bug in {mutant_name}!")
        print("!!! DUMPING INNER TEST OUTPUT FOR DEBUGGING:")
        print(result.stdout.str())
        pytest.fail(f"Test suite was too weak! It passed against broken code: {mutant_name}")

# --- THE META TESTS ---

def test_meta_baseline_correctness(pytester, suite_code):
    """
    ANALYSIS: Baseline Verification.
    STRATEGY: Validate that the test suite PASSES against the known correct implementation.
    """
    result = run_meta(pytester, "correct.py", suite_code)
    outcomes = result.parseoutcomes()
    
    print(f">>> [META] Baseline Results: {outcomes}")
    
    # Assert 100% Pass rate
    if outcomes.get("failed", 0) > 0:
        print(result.stdout.str())
        pytest.fail("The test suite fails against the CORRECT implementation. Fix the tests first.")
    
    assert outcomes.get("passed", 0) > 0
    print(">>> [META] SUCCESS: Baseline verified.")

def test_meta_boundary_verification_tier_jump(pytester, suite_code):
    """
    ANALYSIS: Requirement 2 & 3 (Tier Boundaries).
    STRATEGY: Run the suite against a mutant with an off-by-one threshold (100 vs 101).
    """
    result = run_meta(pytester, "broken_threshold.py", suite_code)
    verify_bug_detection(result, "broken_threshold.py")

def test_meta_determinism_expiration_check(pytester, suite_code):
    """
    ANALYSIS: Requirement 5 (Temporal behavior).
    STRATEGY: Run the suite against a mutant that allows coupons 1 day after expiration.
    """
    result = run_meta(pytester, "broken_expiry.py", suite_code)
    verify_bug_detection(result, "broken_expiry.py")

def test_meta_precision_rounding(pytester, suite_code):
    """
    ANALYSIS: Requirement 9 (Financial Precision).
    STRATEGY: Run the suite against a mutant using ROUND_FLOOR (truncation).
    """
    result = run_meta(pytester, "broken_rounding.py", suite_code)
    verify_bug_detection(result, "broken_rounding.py")