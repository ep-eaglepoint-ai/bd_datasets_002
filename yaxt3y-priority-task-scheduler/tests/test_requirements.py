import unittest
import time
import random
import string
import sys
import os
from datetime import datetime, timedelta
import scheduler

# Helper to detect which implementation is loaded
IS_OPTIMIZED = hasattr(scheduler, "OptimizedScheduler")
SchedulerClass = scheduler.OptimizedScheduler if IS_OPTIMIZED else scheduler.UnoptimizedScheduler
TaskClass = scheduler.Task

class TestRequirements(unittest.TestCase):
    
    def generate_tasks(self, n):
        base = datetime.now()
        tasks = []
        for i in range(n):
            tasks.append(TaskClass(i, f"T{i}", 1, 10, base + timedelta(days=1), [], {}))
        return tasks

    def test_req_1_lookup_complexity(self):
        """Req 1: O(1) Task Lookup (vs O(n))"""
        n = 5000 
        tasks = self.generate_tasks(n)
        sched = SchedulerClass(tasks, {})
        
        start = time.time()
        # Perform n lookups
        for i in range(n):
            sched.find_task_by_id(i)
        duration = time.time() - start
        
        # O(1) * N should be very fast (< 0.05s). O(N) * N = O(N^2) ~ 25M ops -> slow.
        if IS_OPTIMIZED:
            self.assertLess(duration, 0.2, f"Lookup too slow: {duration}s")
        else:
            # Baseline is expected to fail this during strict evaluation
            if os.environ.get("EVALUATION_RUN"):
                self.assertLess(duration, 0.2, f"Lookup too slow (Baseline Expected Fail): {duration}s")

    def test_req_2_cycle_detection_complexity(self):
        """Req 2: O(n+e) Cycle Detection"""
        # Linear chain 0->1->2...->N
        n = 100 
        tasks = []
        base = datetime.now()
        for i in range(n):
            deps = [i-1] if i > 0 else []
            tasks.append(TaskClass(i, f"T{i}", 1, 10, base, deps, {}))
            
        sched = SchedulerClass(tasks, {})
        
        start = time.time()
        sched.check_circular_dependencies()
        duration = time.time() - start
        
        # Optimized (Kahn/DFS) should be instant. 
        # Unoptimized (Recursive O(N^3) or similar) will timeout or be very slow.
        if IS_OPTIMIZED:
             self.assertLess(duration, 0.5, f"Cycle detection too slow: {duration}s")
        else:
             if os.environ.get("EVALUATION_RUN"):
                 self.assertLess(duration, 0.5, f"Cycle detection too slow (Baseline Expected Fail): {duration}s")

    def test_req_3_critical_path_complexity(self):
        """Req 3: O(n+e) Critical Path (vs Exponential O(2^N))"""
        # Diamond Graph: A->B, A->C, B->D, C->D ...
        n_diamonds = 18 
        tasks = []
        base = datetime.now()
        
        # Start node
        tasks.append(TaskClass(0, "Start", 1, 10, base, [], {}))
        current_id = 1
        prev_node = 0
        
        for i in range(n_diamonds):
            # Two nodes depending on prev
            b_id = current_id
            c_id = current_id + 1
            d_id = current_id + 2
            
            tasks.append(TaskClass(b_id, f"B{i}", 1, 10, base, [prev_node], {}))
            tasks.append(TaskClass(c_id, f"C{i}", 1, 10, base, [prev_node], {}))
            tasks.append(TaskClass(d_id, f"End{i}", 1, 10, base, [b_id, c_id], {}))
            
            prev_node = d_id
            current_id += 3
            
        sched = SchedulerClass(tasks, {})
        
        start = time.time()
        sched.calculate_critical_path()
        duration = time.time() - start
        
        if IS_OPTIMIZED:
            self.assertLess(duration, 0.5, f"Critical Path too slow: {duration}s")
        else:
            if os.environ.get("EVALUATION_RUN"):
                self.assertLess(duration, 0.5, f"Critical Path too slow (Baseline Expected Fail): {duration}s")

    def test_req_4_sorting_performance(self):
        """Req 4: O(n log n) Sorting (Timsort vs Bubble)"""
        if not hasattr(SchedulerClass, 'sort_by_priority'):
             # Optimized might not expose this helper if rewritten, 
             # but let's assume if it exists it must be fast.
             # If it doesn't exist, we skip (logic moved to heap).
             return

        n = 500
        tasks = self.generate_tasks(n)
        # Randomize priorities
        for t in tasks:
            t.priority = random.randint(1, 100)
            
        sched = SchedulerClass(tasks, {})
        
        start = time.time()
        sched.sort_by_priority(tasks)
        duration = time.time() - start
        
        if IS_OPTIMIZED:
            self.assertLess(duration, 0.1, f"Sorting too slow: {duration}s")
        else:
            self.assertLess(duration, 0.1, f"Sorting too slow (Baseline Expected Fail): {duration}s")
            
    def test_req_6_string_building(self):
        """Req 6: O(n) String Building (Report Generation)"""
        n = 5000 
        tasks = self.generate_tasks(n)
        sched = SchedulerClass(tasks, {})
        # Fake schedule to generate report from
        sched.schedule = [{"task_name": t.name, "start_time": "x", "end_time": "y", "duration": 1, "task_id": t.task_id} for t in tasks]
        
        start = time.time()
        sched.generate_report()
        duration = time.time() - start
        
        if IS_OPTIMIZED:
            self.assertLess(duration, 0.5, f"Report generation too slow: {duration}s")
        else:
            if os.environ.get("EVALUATION_RUN"):
                self.assertLess(duration, 0.5, f"Report generation too slow (Baseline Expected Fail): {duration}s")

    def test_req_8_total_scheduling_performance(self):
        """Req 8: O(n log n) Scheduling (Heapq)"""
        # We test with 2000 to be fast in typical unit test, but assert strict timing.
        
        n = 500
        tasks = self.generate_tasks(n) # Independent tasks, easy to schedule
        sched = SchedulerClass(tasks, {"cpu": 10000}) # Plenty resources
        
        start = time.time()
        sched.generate_schedule(datetime.now())
        duration = time.time() - start
        
        if IS_OPTIMIZED:
            self.assertLess(duration, 1.0, f"Scheduling too slow: {duration}s")
        else:
             if os.environ.get("EVALUATION_RUN"):
                 self.assertLess(duration, 1.0, f"Scheduling too slow (Baseline Expected Fail): {duration}s")

if __name__ == '__main__':
    unittest.main()
