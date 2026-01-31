"""
Meta-tests for the Go High-Throughput Idempotent Dispatcher.
These tests validate that the implementation in repository_after is correct.
"""

import subprocess
import os
import sys
from pathlib import Path


def get_project_root():
    """Get the project root directory."""
    return Path(__file__).parent.parent.absolute()


def run_go_tests(repo_dir: Path) -> dict:
    """
    Run Go tests in the specified repository directory.
    Returns a dict with pass/fail status and details.
    """
    result = {
        "passed": False,
        "output": "",
        "error": "",
    }
    
    if not (repo_dir / "go.mod").exists():
        result["error"] = f"No go.mod found in {repo_dir}"
        return result
    
    try:
        # Run go test with standard output (no JSON for simplicity)
        process = subprocess.run(
            ["go", "test", "-v", "./..."],
            cwd=str(repo_dir),
            capture_output=True,
            text=True,
            timeout=120,
        )
        
        result["output"] = process.stdout
        result["error"] = process.stderr
        result["passed"] = process.returncode == 0
        
    except subprocess.TimeoutExpired:
        result["error"] = "Tests timed out after 120 seconds"
    except FileNotFoundError:
        result["error"] = "Go not found in PATH"
    except Exception as e:
        result["error"] = str(e)
    
    return result


def check_test_coverage(repo_dir: Path) -> dict:
    """
    Check that required tests exist and cover the key requirements.
    """
    result = {
        "has_sequence_guard_test": False,
        "has_idempotency_test": False,
        "has_shutdown_test": False,
        "has_retry_test": False,
        "has_domain_shard_test": False,
        "coverage_complete": False,
    }
    
    test_file = repo_dir / "dispatcher_test.go"
    if not test_file.exists():
        return result
    
    content = test_file.read_text()
    
    # Check for required test functions
    result["has_sequence_guard_test"] = "TestSequenceGuard" in content
    result["has_idempotency_test"] = "TestIdempotencyGuard" in content
    result["has_shutdown_test"] = "TestGracefulShutdown" in content
    result["has_retry_test"] = "TestRetryPolicy" in content
    result["has_domain_shard_test"] = "TestDomainShard" in content
    
    result["coverage_complete"] = all([
        result["has_sequence_guard_test"],
        result["has_idempotency_test"],
        result["has_shutdown_test"],
    ])
    
    return result


def test_repository_after_has_implementation():
    """Test that repository_after contains the full implementation."""
    project_root = get_project_root()
    repo_after = project_root / "repository_after"
    
    required_files = [
        "go.mod",
        "event.go",
        "store.go",
        "memory_store.go",
        "orchestrator.go",
        "retry.go",
        "dispatcher_test.go",
    ]
    
    missing = []
    for f in required_files:
        if not (repo_after / f).exists():
            missing.append(f)
    
    assert len(missing) == 0, f"Missing required files in repository_after: {missing}"


def test_repository_after_tests_pass():
    """Test that all Go tests in repository_after pass."""
    project_root = get_project_root()
    repo_after = project_root / "repository_after"
    
    result = run_go_tests(repo_after)
    
    assert result["passed"], f"Go tests failed:\n{result['output']}\n{result['error']}"


def test_repository_after_has_required_tests():
    """Test that repository_after contains all required test cases."""
    project_root = get_project_root()
    repo_after = project_root / "repository_after"
    
    coverage = check_test_coverage(repo_after)
    
    assert coverage["has_sequence_guard_test"], "Missing TestSequenceGuard test"
    assert coverage["has_idempotency_test"], "Missing TestIdempotencyGuard test"
    assert coverage["has_shutdown_test"], "Missing TestGracefulShutdown test"


def test_repository_before_is_empty():
    """Test that repository_before has no Go implementation (to prove problem exists)."""
    project_root = get_project_root()
    repo_before = project_root / "repository_before"
    
    # Should not have go.mod
    assert not (repo_before / "go.mod").exists(), \
        "repository_before should not have an implementation"
    
    # Should not have any .go files
    go_files = list(repo_before.glob("*.go"))
    assert len(go_files) == 0, \
        f"repository_before should not have Go files, found: {go_files}"


def test_event_state_machine():
    """Verify the event state machine is correctly implemented."""
    project_root = get_project_root()
    event_file = project_root / "repository_after" / "event.go"
    
    assert event_file.exists(), "event.go not found"
    
    content = event_file.read_text()
    
    # Check for required states
    required_states = ["PENDING", "IN_FLIGHT", "RETRY_WAIT", "FAILED", "COMPLETED"]
    for state in required_states:
        assert state in content, f"Missing state: {state}"
    
    # Check for state transition validation
    assert "CanTransitionTo" in content, "Missing CanTransitionTo method"
    assert "TransitionTo" in content, "Missing TransitionTo method"


def test_orchestrator_has_guards():
    """Verify the orchestrator implements required guards."""
    project_root = get_project_root()
    orchestrator_file = project_root / "repository_after" / "orchestrator.go"
    
    assert orchestrator_file.exists(), "orchestrator.go not found"
    
    content = orchestrator_file.read_text()
    
    # Check for idempotency guard
    assert "inFlightEvents" in content or "InFlight" in content, \
        "Missing idempotency guard"
    
    # Check for entity locking (sequence guard)
    assert "entityLock" in content or "EntityLock" in content, \
        "Missing entity locking for sequence guard"
    
    # Check for domain sharding
    assert "domainSemaphore" in content or "DomainSemaphore" in content, \
        "Missing domain sharding"
    
    # Check for worker pool
    assert "worker" in content.lower() and "wg" in content, \
        "Missing worker pool implementation"


def test_retry_policy_implementation():
    """Verify retry policy with exponential backoff and jitter."""
    project_root = get_project_root()
    retry_file = project_root / "repository_after" / "retry.go"
    
    assert retry_file.exists(), "retry.go not found"
    
    content = retry_file.read_text()
    
    # Check for exponential backoff
    assert "2" in content or "Pow" in content, \
        "Missing exponential backoff logic"
    
    # Check for jitter
    assert "jitter" in content.lower() or "Jitter" in content, \
        "Missing jitter implementation"
    
    # Check for max retries
    assert "MaxRetries" in content or "maxRetries" in content, \
        "Missing max retries configuration"


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
