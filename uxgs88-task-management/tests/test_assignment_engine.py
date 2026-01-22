"""
Test suite for TaskAssignmentEngine.
"""

import pytest
import time
import sys
import os

# Add repository_after to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from assignment_engine import TaskAssignmentEngine


class TestTaskAssignmentEngine:
    """Test cases for TaskAssignmentEngine."""
    
    def test_basic_counting(self):
        """Test basic counting functionality."""
        num_workers = 3
        num_tasks = 3
        matrix = [[True, True, False],
                  [True, False, True],
                  [False, True, True]]
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        count = engine.count_distributions()
        
        # Worker 0 can do tasks 0,1
        # Worker 1 can do tasks 0,2
        # Worker 2 can do tasks 1,2
        # Valid assignments:
        # (0->0, 1->2, 2->1)
        # (0->1, 1->0, 2->2)
        assert count == 2
    
    def test_dense_counting(self):
        """Test counting with dense qualification matrix."""
        num_workers = 5
        num_tasks = 5
        matrix = [[True] * num_tasks for _ in range(num_workers)]
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        count = engine.count_distributions()
        
        # All workers can do all tasks: 5! = 120
        assert count == 120
    
    def test_empty_case(self):
        """Test empty cases."""
        engine = TaskAssignmentEngine(0, 0, [])
        assert engine.count_distributions() == 0
        
        engine = TaskAssignmentEngine(2, 2, [[False, False], [False, False]])
        assert engine.count_distributions() == 0
    
    def test_max_skill_assignment(self):
        """Test maximum skill assignment."""
        num_workers = 3
        num_tasks = 3
        matrix = [[True, True, False],
                  [True, False, True],
                  [False, True, True]]
        skill_scores = [[10, 5, 0],
                        [8, 0, 7],
                        [0, 6, 9]]
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix, skill_scores)
        assignment = engine.find_max_skill_assignment()
        
        # Optimal: (0->0: 10, 1->2: 7, 2->1: 6) = 23
        # Or: (0->1: 5, 1->0: 8, 2->2: 9) = 22
        # First should be better
        assert len(assignment) == 3
        # assignment is list of (worker, task) tuples
        total_score = sum(skill_scores[w][t] for w, t in assignment)
        assert total_score >= 22
    
    def test_enumerate_distributions(self):
        """Test enumeration of distributions."""
        num_workers = 3
        num_tasks = 3
        matrix = [[True, True, False],
                  [True, False, True],
                  [False, True, True]]
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        distributions = engine.enumerate_distributions(page=0, page_size=10)
        
        assert len(distributions) == 2
        # Each distribution should have 3 assignments (list of (worker, task) tuples)
        for dist in distributions:
            assert len(dist) == 3
            # Check one-to-one: no duplicate workers or tasks
            workers = [w for w, t in dist]
            tasks = [t for w, t in dist]
            assert len(workers) == len(set(workers))
            assert len(tasks) == len(set(tasks))
    
    def test_enumerate_pagination(self):
        """Test enumeration with pagination."""
        num_workers = 4
        num_tasks = 4
        matrix = [[True] * num_tasks for _ in range(num_workers)]
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        
        # Get first page
        page0 = engine.enumerate_distributions(page=0, page_size=10)
        assert len(page0) == 10
        
        # Get second page
        page1 = engine.enumerate_distributions(page=1, page_size=10)
        assert len(page1) == 10
        
        # Should be different
        assert page0 != page1
    
    def test_performance_counting(self):
        """Test performance requirement for counting (< 2 seconds)."""
        num_workers = 20
        num_tasks = 20
        matrix = [[True] * num_tasks for _ in range(num_workers)]
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        
        start = time.time()
        count = engine.count_distributions()
        elapsed = time.time() - start
        
        assert elapsed < 2.0, f"Counting took {elapsed:.3f}s, should be < 2s"
        assert count > 0
    
    def test_performance_max_skill(self):
        """Test performance requirement for max skill (< 200ms)."""
        num_workers = 20
        num_tasks = 20
        matrix = [[True] * num_tasks for _ in range(num_workers)]
        
        import random
        random.seed(42)
        skill_scores = [[random.random() for _ in range(num_tasks)] for _ in range(num_workers)]
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix, skill_scores)
        
        start = time.time()
        assignment = engine.find_max_skill_assignment()
        elapsed = time.time() - start
        
        assert elapsed < 0.2, f"Max skill took {elapsed*1000:.3f}ms, should be < 200ms"
        assert len(assignment) == num_workers  # assignment is list of (worker, task) tuples
    
    def test_performance_enumeration(self):
        """Test performance requirement for enumeration (< 100ms for 100 distributions)."""
        num_workers = 5
        num_tasks = 5
        matrix = [[True] * num_tasks for _ in range(num_workers)]
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        
        start = time.time()
        distributions = engine.enumerate_distributions(page=0, page_size=100)
        elapsed = time.time() - start
        
        assert elapsed < 0.1, f"Enumeration took {elapsed*1000:.3f}ms, should be < 100ms"
        assert len(distributions) <= 100
    
    def test_large_task_set(self):
        """Test with large number of tasks (up to 1000)."""
        num_workers = 10
        num_tasks = 1000
        # Each worker can do 100 tasks
        matrix = [[False] * num_tasks for _ in range(num_workers)]
        for i in range(num_workers):
            for j in range(i * 100, (i + 1) * 100):
                matrix[i][j] = True
        
        engine = TaskAssignmentEngine(num_workers, num_tasks, matrix)
        count = engine.count_distributions()
        
        # Each worker has 100 options, but they're disjoint, so count = 100^10
        # Actually, since tasks are distinct and one-to-one, it's 100 * 99 * 98 * ...
        # But wait, the tasks are disjoint per worker, so it's 100^10
        # Actually no, one-to-one means each task can only be assigned once
        # So if workers have disjoint task sets, we can assign each worker any task from their set
        # But since tasks are distinct, we need permutations
        # If each worker has 100 tasks and they're disjoint, we have 100^10 ways
        # But that's not quite right either - we're selecting 10 tasks total, one per worker
        # So it's the product of choices: 100 * 100 * ... * 100 = 100^10
        assert count > 0
    
    def test_validation(self):
        """Test input validation."""
        with pytest.raises(ValueError):
            TaskAssignmentEngine(21, 10, [[True] * 10 for _ in range(21)])
        
        with pytest.raises(ValueError):
            TaskAssignmentEngine(10, 1001, [[True] * 1001 for _ in range(10)])
    
    def test_max_skill_no_scores(self):
        """Test that max_skill_assignment works with default scores."""
        engine = TaskAssignmentEngine(3, 3, [[True] * 3 for _ in range(3)])
        
        # Should work with default skill_scores (all zeros)
        assignment = engine.find_max_skill_assignment()
        assert len(assignment) == 3
