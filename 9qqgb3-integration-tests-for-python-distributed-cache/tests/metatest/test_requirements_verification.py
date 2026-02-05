"""Metatests to verify that all 10 requirements are tested."""
import ast
from pathlib import Path


def get_test_functions_from_file(file_path):
    """Extract all test function names from a test file."""
    content = file_path.read_text()
    tree = ast.parse(content, filename=str(file_path))
    
    functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
    return [f.name for f in functions if f.name.startswith("test_")]


def get_imported_names(file_path):
    """Extract imported names from a test file."""
    content = file_path.read_text()
    tree = ast.parse(content, filename=str(file_path))
    imported = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported.add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported.add(node.module)
            for alias in node.names:
                imported.add(alias.name)
    return imported


def assert_required_tests_present(test_functions, required):
    missing = [name for name in required if name not in test_functions]
    assert not missing, f"Missing required tests: {missing}"


def test_requirement_1_ttl_tests_exist():
    """Verify Requirement 1 (TTL expiration) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    ttl_test_file = test_dir / "test_ttl.py"
    
    assert ttl_test_file.exists(), "test_ttl.py should exist for Requirement 1"
    
    test_functions = get_test_functions_from_file(ttl_test_file)
    assert len(test_functions) > 0, "test_ttl.py should contain test functions"
    required = [
        "test_ttl_precision_to_the_second",
        "test_ttl_exactly_at_boundary_expires",
        "test_ttl_just_before_boundary_returns_value",
        "test_ttl_zero_expires_immediately",
        "test_ttl_with_get_removes_from_storage",
        "test_ttl_with_exists_removes_from_storage",
    ]
    assert_required_tests_present(test_functions, required)

    # Must use freezegun
    imported = get_imported_names(ttl_test_file)
    assert "freezegun" in imported or "freeze_time" in imported, \
        "test_ttl.py should use freezegun for time control"


def test_requirement_2_lru_tests_exist():
    """Verify Requirement 2 (LRU eviction) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    lru_test_file = test_dir / "test_lru_eviction.py"
    
    assert lru_test_file.exists(), "test_lru_eviction.py should exist for Requirement 2"
    
    test_functions = get_test_functions_from_file(lru_test_file)
    assert len(test_functions) > 0, "test_lru_eviction.py should contain test functions"
    required = [
        "test_lru_eviction_get_updates_access_order",
        "test_lru_eviction_set_updates_access_order",
        "test_lru_eviction_multiple_sequential_evictions",
        "test_lru_eviction_counter_increments_exactly_one_per_eviction",
    ]
    assert_required_tests_present(test_functions, required)


def test_requirement_3_increment_tests_exist():
    """Verify Requirement 3 (Concurrent increment) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    increment_test_file = test_dir / "test_atomic_and_concurrency.py"
    
    assert increment_test_file.exists(), "test_atomic_and_concurrency.py should exist for Requirement 3"
    
    test_functions = get_test_functions_from_file(increment_test_file)
    assert len(test_functions) > 0, "test_atomic_and_concurrency.py should contain test functions"
    required = [
        "test_atomic_increment_multi_thread",
        "test_increment_non_numeric_raises_value_error",
        "test_concurrent_increment_with_different_amounts",
    ]
    assert_required_tests_present(test_functions, required)


def test_requirement_4_statistics_tests_exist():
    """Verify Requirement 4 (Statistics) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    stats_test_file = test_dir / "test_stats_and_patterns.py"
    
    assert stats_test_file.exists(), "test_stats_and_patterns.py should exist for Requirement 4"
    
    test_functions = get_test_functions_from_file(stats_test_file)
    assert len(test_functions) > 0, "test_stats_and_patterns.py should contain test functions"
    required = [
        "test_stats_evictions_counter_accuracy",
        "test_stats_misses_increment_on_expired_key_access",
        "test_stats_clear_resets_all_counters",
    ]
    assert_required_tests_present(test_functions, required)


def test_requirement_5_pattern_tests_exist():
    """Verify Requirement 5 (Pattern matching) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    pattern_test_file = test_dir / "test_stats_and_patterns.py"
    
    assert pattern_test_file.exists(), "test_stats_and_patterns.py should exist for Requirement 5"
    
    test_functions = get_test_functions_from_file(pattern_test_file)
    assert len(test_functions) > 0, "test_stats_and_patterns.py should contain test functions"
    required = [
        "test_keys_pattern_with_question_mark_edge_cases",
        "test_keys_pattern_star_matches_all",
        "test_delete_pattern_with_no_matches_returns_zero",
    ]
    assert_required_tests_present(test_functions, required)


def test_requirement_6_save_tests_exist():
    """Verify Requirement 6 (Save method) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    persistence_test_file = test_dir / "test_persistence.py"
    
    assert persistence_test_file.exists(), "test_persistence.py should exist for Requirement 6"
    
    test_functions = get_test_functions_from_file(persistence_test_file)
    assert len(test_functions) > 0, "test_persistence.py should contain test functions"
    required = [
        "test_save_uses_pickle_and_excludes_expired_entries",
        "test_save_preserves_statistics",
    ]
    assert_required_tests_present(test_functions, required)


def test_requirement_7_load_tests_exist():
    """Verify Requirement 7 (Load method) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    persistence_test_file = test_dir / "test_persistence.py"
    
    assert persistence_test_file.exists(), "test_persistence.py should exist for Requirement 7"
    
    test_functions = get_test_functions_from_file(persistence_test_file)
    assert len(test_functions) > 0, "test_persistence.py should contain test functions"
    required = [
        "test_load_restores_values_and_stats_and_ttl_remaining",
        "test_load_discards_all_expired_entries",
    ]
    assert_required_tests_present(test_functions, required)


def test_requirement_8_cleanup_tests_exist():
    """Verify Requirement 8 (Background cleanup) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    cleanup_test_file = test_dir / "test_background_cleanup.py"
    
    assert cleanup_test_file.exists(), "test_background_cleanup.py should exist for Requirement 8"
    
    test_functions = get_test_functions_from_file(cleanup_test_file)
    assert len(test_functions) > 0, "test_background_cleanup.py should contain test functions"
    required = [
        "test_background_cleanup_thread_is_started",
        "test_manual_cleanup_removes_expired_entries_without_hanging",
    ]
    assert_required_tests_present(test_functions, required)


def test_requirement_9_thread_safety_tests_exist():
    """Verify Requirement 9 (Thread safety) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    thread_test_file = test_dir / "test_thread_safety_stress.py"
    
    assert thread_test_file.exists(), "test_thread_safety_stress.py should exist for Requirement 9"
    
    test_functions = get_test_functions_from_file(thread_test_file)
    assert len(test_functions) > 0, "test_thread_safety_stress.py should contain test functions"
    required = [
        "test_thread_safety_across_all_public_methods_under_load",
        "test_thread_safety_with_rlock_reentrancy",
        "test_thread_safety_all_public_methods_individually",
    ]
    assert_required_tests_present(test_functions, required)


def test_requirement_10_edge_cases_tests_exist():
    """Verify Requirement 10 (Edge cases) has tests."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    edge_cases_test_file = test_dir / "test_core_operations.py"
    
    assert edge_cases_test_file.exists(), "test_core_operations.py should exist for Requirement 10"
    
    test_functions = get_test_functions_from_file(edge_cases_test_file)
    assert len(test_functions) > 0, "test_core_operations.py should contain test functions"
    required = [
        "test_operations_on_empty_cache_do_not_raise",
        "test_set_get_with_none_value",
        "test_unicode_and_very_long_keys_work",
    ]
    assert_required_tests_present(test_functions, required)

