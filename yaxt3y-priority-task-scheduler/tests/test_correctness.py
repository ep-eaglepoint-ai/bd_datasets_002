import unittest
from datetime import datetime, timedelta
from common_test_utils import OptimizedScheduler, TaskAfter

class TestCorrectness(unittest.TestCase):
    def test_dependency_chain(self):
        """Test 3: Basic Dependency Chain A->B->C"""
        base = datetime.now()
        # A(10m) -> B(10m) -> C(10m)
        t1 = TaskAfter(1, "A", 1, 10, base + timedelta(hours=1), [], {})
        t2 = TaskAfter(2, "B", 1, 10, base + timedelta(hours=1), [1], {})
        t3 = TaskAfter(3, "C", 1, 10, base + timedelta(hours=1), [2], {})
        
        scheduler = OptimizedScheduler([t1, t2, t3], {})
        schedule = scheduler.generate_schedule(base)
        
        # Verify order
        schedule_map = {entry['task_id']: entry for entry in schedule}
        
        start_a = datetime.fromisoformat(schedule_map[1]['start_time'])
        end_a = datetime.fromisoformat(schedule_map[1]['end_time'])
        start_b = datetime.fromisoformat(schedule_map[2]['start_time'])
        end_b = datetime.fromisoformat(schedule_map[2]['end_time'])
        start_c = datetime.fromisoformat(schedule_map[3]['start_time'])
        
        self.assertGreaterEqual(start_b, end_a)
        self.assertGreaterEqual(start_c, end_b)

    def test_resource_constraints(self):
        """Test 4: Resource Constraints (Serialization)"""
        base = datetime.now()
        # T1 needs 1 CPU, T2 needs 1 CPU. Avail 1 CPU. Should run sequential.
        t1 = TaskAfter(1, "A", 1, 10, base, [], {"cpu": 1})
        t2 = TaskAfter(2, "B", 1, 10, base, [], {"cpu": 1})
        
        scheduler = OptimizedScheduler([t1, t2], {"cpu": 1})
        schedule = scheduler.generate_schedule(base)
        
        times = []
        for entry in schedule:
            start = datetime.fromisoformat(entry['start_time'])
            end = datetime.fromisoformat(entry['end_time'])
            times.append((start, end))
            
        times.sort()
        # Expect serialization (Task 1 ends before Task 2 starts).
        t1_end = times[0][1]
        t2_start = times[1][0]
        
        self.assertGreaterEqual(t2_start, t1_end)

    def test_priority_ordering(self):
        """Test 5: Priority Ordering"""
        base = datetime.now()
        # T1 (Prio 1), T2 (Prio 10). T2 should run first if possible.
        t1 = TaskAfter(1, "Low", 1, 10, base + timedelta(hours=1), [], {})
        t2 = TaskAfter(2, "High", 10, 10, base + timedelta(hours=1), [], {})
        
        scheduler = OptimizedScheduler([t1, t2], {})
        schedule = scheduler.generate_schedule(base)
        
        # First executed task should be T2
        self.assertEqual(schedule[0]['task_id'], 2)

if __name__ == '__main__':
    unittest.main()
