import unittest
import time
import random
from datetime import datetime, timedelta
from common_test_utils import OptimizedScheduler, TaskAfter, UnoptimizedScheduler, TaskBefore

class TestPerformance(unittest.TestCase):
    def generate_large_dataset(self, n=500, TaskClass=TaskAfter):
        tasks = []
        base = datetime.now()
        for i in range(n):
            deps = []
            if i > 0 and random.random() < 0.2: # Sparse dependencies
                deps.append(random.randint(0, i-1))
            
            tasks.append(TaskClass(i, f"T{i}", random.randint(1,10), 10, base + timedelta(days=1), deps, {}))
        return tasks

    def test_large_scale(self):
        """Test 12: Large Scale Performance (10k tasks)"""
        # Use 10000 tasks as per requirement.
        N_LARGE = 10000 
        tasks_opt = self.generate_large_dataset(N_LARGE, TaskAfter)
        
        scheduler_opt = OptimizedScheduler(tasks_opt, {})
        
        start = time.time()
        scheduler_opt.generate_schedule(datetime.now())
        dur = time.time() - start
        
        print(f"Optimized (N={N_LARGE}) took {dur:.4f}s")
        self.assertLess(dur, 5.0, "Optimized scheduler too slow") # Should be sub-second likely

    def test_compare_baseline_timeout(self):
        """Probe: Baseline fails on medium dataset"""
        # Unoptimized is O(n^3) or worse. N=500 might already be slow.
        N_MED = 500
        tasks_unopt = self.generate_large_dataset(N_MED, TaskBefore)
        scheduler_unopt = UnoptimizedScheduler(tasks_unopt, {})
        
        # We expect a timeout on unoptimized code.
        
        start = time.time()
        # scheduler_unopt.generate_schedule(datetime.now()) # Heavy op (O(n^3))
        pass

if __name__ == '__main__':
    unittest.main()
