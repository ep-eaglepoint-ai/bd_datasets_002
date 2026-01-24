import unittest
from datetime import datetime, timedelta
from common_test_utils import OptimizedScheduler, TaskAfter

class TestEdgeCases(unittest.TestCase):
    def test_empty_tasks(self):
        """Test 9: Empty Task List"""
        scheduler = OptimizedScheduler([], {})
        schedule = scheduler.generate_schedule(datetime.now())
        self.assertEqual(len(schedule), 0)
        
    def test_single_task(self):
        """Test 10: Single Task"""
        t1 = TaskAfter(1, "A", 1, 10, datetime.now(), [], {})
        scheduler = OptimizedScheduler([t1], {})
        schedule = scheduler.generate_schedule(datetime.now())
        self.assertEqual(len(schedule), 1)
        self.assertEqual(schedule[0]['task_id'], 1)
        
    def test_disconnected_graph(self):
        """Test 11: Disconnected Graph"""
        # A->B, C->D
        base = datetime.now()
        t1 = TaskAfter(1, "A", 1, 10, base, [], {})
        t2 = TaskAfter(2, "B", 1, 10, base, [1], {})
        t3 = TaskAfter(3, "C", 1, 10, base, [], {})
        t4 = TaskAfter(4, "D", 1, 10, base, [3], {})
        
        scheduler = OptimizedScheduler([t1, t2, t3, t4], {})
        schedule = scheduler.generate_schedule(base)
        self.assertEqual(len(schedule), 4)

if __name__ == '__main__':
    unittest.main()
