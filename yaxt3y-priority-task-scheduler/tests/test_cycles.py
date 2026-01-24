import unittest
from datetime import datetime, timedelta
from common_test_utils import OptimizedScheduler, TaskAfter

class TestCycles(unittest.TestCase):
    def test_direct_cycle(self):
        """Test 6: Direct Cycle A <-> B"""
        base = datetime.now()
        t1 = TaskAfter(1, "A", 1, 10, base, [2], {})
        t2 = TaskAfter(2, "B", 1, 10, base, [1], {})
        
        scheduler = OptimizedScheduler([t1, t2], {})
        self.assertTrue(scheduler.check_circular_dependencies())
        self.assertIsNone(scheduler.generate_schedule(base))

    def test_indirect_cycle(self):
        """Test 7: Indirect Cycle A -> B -> C -> A"""
        base = datetime.now()
        t1 = TaskAfter(1, "A", 1, 10, base, [2], {})
        t2 = TaskAfter(2, "B", 1, 10, base, [3], {})
        t3 = TaskAfter(3, "C", 1, 10, base, [1], {})
        
        scheduler = OptimizedScheduler([t1, t2, t3], {})
        self.assertTrue(scheduler.check_circular_dependencies())

if __name__ == '__main__':
    unittest.main()
