import unittest
from datetime import datetime, timedelta
from common_test_utils import OptimizedScheduler, TaskAfter

class TestCriticalPath(unittest.TestCase):
    def test_diamond_graph(self):
        """Test 8: Critical Path - Diamond Graph"""
        base = datetime.now()
        # Diamond Graph: A(10)->B(20)->D(10) / A(10)->C(5)->D(10). Critical Path: ABD (40).
        t1 = TaskAfter(1, "A", 1, 10, base, [], {})
        t2 = TaskAfter(2, "B", 1, 20, base, [1], {}) # Depends on A
        t3 = TaskAfter(3, "C", 1, 5, base, [1], {})  # Depends on A
        t4 = TaskAfter(4, "D", 1, 10, base, [2, 3], {}) # Depends on B and C
        
        scheduler = OptimizedScheduler([t1, t2, t3, t4], {})
        path, length = scheduler.calculate_critical_path()
        
        self.assertEqual(length, 40)
        self.assertEqual(path, [1, 2, 4])

if __name__ == '__main__':
    unittest.main()
