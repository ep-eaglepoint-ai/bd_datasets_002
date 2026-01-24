import unittest
from datetime import datetime, timedelta
import scheduler

# Helper to detect which implementation is loaded
IS_OPTIMIZED = hasattr(scheduler, "OptimizedScheduler")
SchedulerClass = scheduler.OptimizedScheduler if IS_OPTIMIZED else scheduler.UnoptimizedScheduler
TaskClass = scheduler.Task

class TestStructure(unittest.TestCase):
    def test_has_task_map(self):
        """Test: Scheduler should have 'task_map' for O(1) lookup."""
        # Unoptimized uses linear search (no task_map). Optimized MUST have it.
        sched = SchedulerClass([], {})
        self.assertTrue(hasattr(sched, 'task_map'), "Optimized scheduler must have 'task_map' attribute")

    def test_execution_log_is_list(self):
        """Test: execution_log should be a list (not string concat)."""
        sched = SchedulerClass([], {})
        self.assertIsInstance(sched.execution_log, list, "Optimized execution_log must be a list")

    def test_build_all_paths_removed(self):
        """Test: 'build_all_paths' helper should be removed."""
        sched = SchedulerClass([], {})
        self.assertFalse(hasattr(sched, 'build_all_paths'), "Optimized scheduler should NOT have 'build_all_paths'")

    def test_has_adjacency_list(self):
        """Test: Scheduler should have 'dependents' adjacency list."""
        sched = SchedulerClass([], {})
        self.assertTrue(hasattr(sched, 'dependents'), "Optimized scheduler must have 'dependents' adjacency list")

    def test_calculate_priority_score_removed(self):
        """Test (Req 5): 'calculate_priority_score' should be removed/replaced by Heap logic."""
        sched = SchedulerClass([], {})
        self.assertFalse(hasattr(sched, 'calculate_priority_score'), "Optimized should replace explicit scoring with Heap sort")

    def test_get_available_tasks_removed(self):
        """Test (Req 7): 'get_available_tasks' iteration should be removed."""
        sched = SchedulerClass([], {})
        self.assertFalse(hasattr(sched, 'get_available_tasks'), "Optimized should not iterate available tasks (O(N))")

if __name__ == '__main__':
    unittest.main()
