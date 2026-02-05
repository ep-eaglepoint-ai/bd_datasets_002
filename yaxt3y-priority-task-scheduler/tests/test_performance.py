import unittest
import time
import random
import statistics
from datetime import datetime, timedelta
from common_test_utils import OptimizedScheduler, TaskAfter, UnoptimizedScheduler, TaskBefore

class TestPerformance(unittest.TestCase):

    def generate_large_dataset(self, n=500, TaskClass=TaskAfter, seed=0):
        rng = random.Random(seed)
        tasks = []
        base = datetime(2020, 1, 1)
        for i in range(n):
            deps = []
            if i > 0 and rng.random() < 0.2:
                deps.append(rng.randint(0, i - 1))

            tasks.append(
                TaskClass(
                    i,
                    f"T{i}",
                    rng.randint(1, 10),
                    10,
                    base + timedelta(days=1),
                    deps,
                    {},
                )
            )
        return tasks

    def measure_duration(self, scheduler, start_time, runs=2):
        durations = []
        for _ in range(runs):
            start = time.perf_counter()
            scheduler.generate_schedule(start_time)
            durations.append(time.perf_counter() - start)
        return statistics.median(durations)

    def test_scaling_behavior(self):
        """Check runtime scaling with input size for optimized scheduler."""
        sizes = [200, 400, 800]
        durations = []
        for n in sizes:
            tasks_opt = self.generate_large_dataset(n, TaskAfter, seed=42)
            scheduler_opt = OptimizedScheduler(tasks_opt, {})
            dur = self.measure_duration(scheduler_opt, datetime(2020, 1, 1))
            durations.append(dur)

        ratio_2x = durations[1] / max(durations[0], 1e-9)
        ratio_4x = durations[2] / max(durations[1], 1e-9)
        print(f"Scaling ratios: 2x={ratio_2x:.2f}, 4x={ratio_4x:.2f}")

        self.assertLess(ratio_2x, 4.0, "Scaling from N to 2N is too steep")
        self.assertLess(ratio_4x, 4.0, "Scaling from 2N to 4N is too steep")

    def test_relative_improvement_vs_baseline(self):
        """Compare optimized vs unoptimized on identical inputs."""
        n = 300
        tasks_opt = self.generate_large_dataset(n, TaskAfter, seed=7)
        tasks_unopt = self.generate_large_dataset(n, TaskBefore, seed=7)

        scheduler_opt = OptimizedScheduler(tasks_opt, {})
        scheduler_unopt = UnoptimizedScheduler(tasks_unopt, {})

        dur_opt = self.measure_duration(scheduler_opt, datetime(2020, 1, 1))
        dur_unopt = self.measure_duration(scheduler_unopt, datetime(2020, 1, 1))

        speedup = dur_unopt / max(dur_opt, 1e-9)
        print(f"Relative speedup: {speedup:.2f}x")

        self.assertGreater(
            speedup, 1.5, "Optimized scheduler should be faster than baseline"
        )


if __name__ == '__main__':
    unittest.main()
