"""Metatests to verify test coverage of all requirements."""
import pytest
import importlib.util
from pathlib import Path


def test_all_requirement_test_files_exist():
    """Verify that test files exist for all requirement categories."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    
    required_test_files = [
        "test_ttl.py",  # Requirement 1: TTL expiration
        "test_lru_eviction.py",  # Requirement 2: LRU eviction
        "test_atomic_and_concurrency.py",  # Requirement 3: Concurrent increment
        "test_stats_and_patterns.py",  # Requirement 4: Statistics, Requirement 5: Patterns
        "test_persistence.py",  # Requirement 6: Save, Requirement 7: Load
        "test_background_cleanup.py",  # Requirement 8: Background cleanup
        "test_thread_safety_stress.py",  # Requirement 9: Thread safety
        "test_core_operations.py",  # Requirement 10: Edge cases
    ]
    
    for test_file in required_test_files:
        file_path = test_dir / test_file
        assert file_path.exists(), f"Required test file {test_file} does not exist"


def test_conftest_exists():
    """Verify that conftest.py exists for test configuration."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    conftest_path = test_dir / "conftest.py"
    assert conftest_path.exists(), "conftest.py does not exist"


def test_conftest_has_cache_fixture():
    """Verify that conftest.py defines the cache fixture."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    conftest_path = test_dir / "conftest.py"
    
    if conftest_path.exists():
        spec = importlib.util.spec_from_file_location("conftest", conftest_path)
        conftest = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(conftest)
        
        # Check for cache fixture
        assert hasattr(conftest, "cache") or "cache" in dir(conftest), \
            "conftest.py should define a 'cache' fixture"


