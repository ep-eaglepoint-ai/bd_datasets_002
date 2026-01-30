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
        # Trajectory claims < 0.2s. We allow 0.5s for CI variance.
        self.assertLess(dur, 0.5, f"Optimized scheduler too slow: {dur}s")

    def test_compare_baseline_timeout(self):
        """Probe: Baseline fails on medium dataset"""
        # Unoptimized is O(n^3) or worse. N=500 might already be slow.
        N_MED = 500
        tasks_unopt = self.generate_large_dataset(N_MED, TaskBefore)
        scheduler_unopt = UnoptimizedScheduler(tasks_unopt, {})
        
        # We expect a timeout on unoptimized code if N is large.
        # Even with N=500, O(N^3) will be slow.
        start = time.time()
        # We don't want to hang the CI, so we use a smaller N if we want a fast fail,
        # or we just rely on pytest-timeout or manual check.
        # But for evaluation, we want it to fail correctly.
        
        # To avoid the 'lying' claim, let's actually run it but with a smaller N that shows the gap.
        scheduler_unopt.generate_schedule(datetime.now()) 
        dur = time.time() - start
        print(f"Unoptimized (N={N_MED}) took {dur:.4f}s")
        # Even for 500 tasks, unoptimized is likely > 0.5s.
        self.assertGreater(dur, 0.1, "Baseline should have been slow")

if __name__ == '__main__':
    unittest.main()
