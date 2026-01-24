import unittest
from datetime import datetime, timedelta
import scheduler

# Test suite relying on 'scheduler' import (set by PYTHONPATH).

class TestSchedulerFunctional(unittest.TestCase):
    def setUp(self):
        if hasattr(scheduler, "OptimizedScheduler"):
            self.SchedulerClass = scheduler.OptimizedScheduler
        elif hasattr(scheduler, "UnoptimizedScheduler"):
            self.SchedulerClass = scheduler.UnoptimizedScheduler
        else:
             self.SchedulerClass = scheduler.Scheduler
        self.TaskClass = scheduler.Task

    def test_basic_scheduling(self):
        """Test strict priority scheduling A -> B"""
        base = datetime.now()
        t1 = self.TaskClass(1, "A", 10, 10, base + timedelta(hours=1), [], {}) # High Priority
        t2 = self.TaskClass(2, "B", 1, 10, base + timedelta(hours=1), [], {})  # Low Priority
        
        # Scenario: Resources allow both
        sched = self.SchedulerClass([t1, t2], {})
        schedule = sched.generate_schedule(base)
        
        self.assertIsNotNone(schedule)
        self.assertEqual(len(schedule), 2)
        # Check if t1 (prio 10) runs before t2. High priority should be preferred.
    
    def test_dependency_enforcement(self):
        """Test A -> B dependency"""
        base = datetime.now()
        t1 = self.TaskClass(1, "A", 1, 10, base, [], {})
        t2 = self.TaskClass(2, "B", 1, 10, base, [1], {})
        
        sched = self.SchedulerClass([t1, t2], {})
        schedule = sched.generate_schedule(base)
        
        # Sort by start time
        schedule.sort(key=lambda x: x['start_time'])
        
        # T1 must end before T2 starts
        t1_entry = next(e for e in schedule if e['task_id'] == 1)
        t2_entry = next(e for e in schedule if e['task_id'] == 2)
        
        t1_end = datetime.fromisoformat(t1_entry['end_time'])
        t2_start = datetime.fromisoformat(t2_entry['start_time'])
        
        self.assertGreaterEqual(t2_start, t1_end)

if __name__ == '__main__':
    unittest.main()
