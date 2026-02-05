import unittest
from datetime import datetime
from common_test_utils import UnoptimizedScheduler, OptimizedScheduler, TaskAfter

class TestConsistencyAPI(unittest.TestCase):
    def test_api_signatures(self):
        """Test 1: API Signature Match"""
        unopt = UnoptimizedScheduler([], {})
        opt = OptimizedScheduler([], {})
        
        methods = ['generate_schedule', 'calculate_metrics', 'generate_report', 'calculate_critical_path']
        for m in methods:
            self.assertTrue(hasattr(opt, m), f"Optimized scheduler missing {m}")
            self.assertTrue(hasattr(unopt, m), f"Unoptimized scheduler missing {m}")

    def test_output_format(self):
        """Test 2: Basic Output Format"""
        tasks = [TaskAfter(1, "Test", 1, 10, datetime.now(), [], {})]
        res = {"cpu": 1}
        
        opt = OptimizedScheduler(tasks, res)
        schedule = opt.generate_schedule(datetime.now())
        
        self.assertIsInstance(schedule, list)
        if schedule:
            entry = schedule[0]
            expected_keys = {"task_id", "task_name", "start_time", "end_time", "duration"}
            self.assertTrue(expected_keys.issubset(entry.keys()))

if __name__ == '__main__':
    unittest.main()
