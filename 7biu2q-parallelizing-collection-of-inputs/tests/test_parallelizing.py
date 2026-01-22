"""
Tests for parallelizing implementations based on the 5 requirements.
Tests fail for repository_before, pass for repository_after.
"""
import pytest
import sys
import os
import re
from multiprocessing import cpu_count

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_source_code():
    """Get the source code based on TEST_IMPLEMENTATION environment variable."""
    impl = os.environ.get("TEST_IMPLEMENTATION", "after")
    
    if impl == "before":
        path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                           "repository_before", "parallelizing.py")
    else:
        path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                           "repository_after", "parallelizing.py")
    
    with open(path, "r") as f:
        return f.read()


class TestRequirement1LimitConcurrentProcesses:
    """Requirement 1: The code must limit the number of concurrent processes."""

    def test_uses_pool_not_individual_processes(self):
        """Test that implementation uses Pool instead of individual Process objects."""
        source = get_source_code()
        
        uses_pool = "Pool" in source
        spawns_in_loop = bool(re.search(r'for.*Process\s*\(', source, re.DOTALL))
        
        assert uses_pool and not spawns_in_loop, \
            "Implementation must use Pool, not spawn Process in a loop"


class TestRequirement2EfficientCPUUtilization:
    """Requirement 2: Efficiently utilize CPU cores without spawning one process per task."""

    def test_pool_map_or_similar(self):
        """Test that implementation uses pool.map or similar efficient scheduling."""
        source = get_source_code()
        
        uses_efficient_scheduling = (
            ".map(" in source or 
            ".imap(" in source or 
            ".starmap(" in source
        )
        
        assert uses_efficient_scheduling, \
            "Implementation must use pool.map/imap/starmap for efficient scheduling"


class TestRequirement3MinimizeOverhead:
    """Requirement 3: Process creation/teardown overhead must be minimized."""

    def test_uses_context_manager_or_close(self):
        """Test that Pool is properly managed."""
        source = get_source_code()
        
        uses_context_manager = "with Pool" in source
        uses_close = ".close()" in source and ".join()" in source
        
        assert uses_context_manager or uses_close, \
            "Implementation must use Pool with context manager or proper close/join"


class TestRequirement4AllCoresBusy:
    """Requirement 4: All CPU cores remain busy when tasks are available."""

    def test_uses_cpu_count_for_workers(self):
        """Test that Pool uses cpu_count for worker processes."""
        source = get_source_code()
        
        uses_cpu_count = "cpu_count()" in source or "cpu_count()" in source
        
        assert uses_cpu_count, \
            "Implementation must use cpu_count() to set number of workers"


class TestRequirement5PredictableScaling:
    """Requirement 5: Total execution time must scale predictably."""

    def test_returns_results(self):
        """Test that implementation returns results for predictable behavior."""
        source = get_source_code()
        
        returns_results = "return" in source
        
        assert returns_results, \
            "Implementation must return results for predictable behavior"

    def test_no_unlimited_process_spawning(self):
        """Test that implementation doesn't spawn unlimited processes."""
        source = get_source_code()
        
        has_process_append_pattern = bool(re.search(
            r'processes\.append\s*\(\s*Process', source
        ))
        
        assert not has_process_append_pattern, \
            "Implementation must not append Process objects in a loop"
