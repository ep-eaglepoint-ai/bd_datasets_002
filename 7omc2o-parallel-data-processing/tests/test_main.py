import pytest
import sys
import os
import time
import inspect

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', os.environ.get('REPO_PATH', 'repository_after')))

from main import generate_test_data, generate_test_matrix, generate_test_text

try:
    from main import OptimizedParallelProcessor as ProcessorClass
    OPTIMIZED = True
except ImportError:
    from main import UnoptimizedParallelProcessor as ProcessorClass
    OPTIMIZED = False

import main as main_module


class TestOptimizationPatterns:
    def test_uses_pool_instead_of_spawn_per_item(self):
        source = inspect.getsource(ProcessorClass.process_data_spawn_per_item)
        assert 'pool' in source.lower() or 'Pool' in source, \
            "process_data_spawn_per_item should use a Pool instead of spawning processes per item"
        assert 'for item in data' not in source or 'Process(' not in source, \
            "Should not spawn a Process for each item in data"
    
    def test_no_file_based_ipc(self):
        source = inspect.getsource(ProcessorClass.process_with_file_based_ipc)
        assert 'tempfile' not in source and 'json.dump' not in source, \
            "process_with_file_based_ipc should not use file-based serialization"
    
    def test_no_excessive_queue_locking(self):
        source = inspect.getsource(ProcessorClass.process_with_excessive_queue_ops)
        assert 'with lock' not in source.lower() or 'output_queue.put' not in source, \
            "Should not use locks around queue operations (queues are already thread-safe)"
    
    def test_statistics_uses_builtins(self):
        """The optimized version should use efficient builtins for statistics."""
        source = inspect.getsource(ProcessorClass.compute_statistics_sequential)
        assert 'sum(' in source, "Should use built-in sum() function"
        assert 'sorted(' in source, "Should use built-in sorted() function"
        assert 'for i in range(n)' not in source or 'for j in range' not in source, \
            "Should not use bubble sort for finding median"
    
    def test_prime_finding_uses_sieve(self):
        source = inspect.getsource(main_module)
        has_sieve = 'sieve' in source.lower() or 'is_prime' in source
        prime_method = inspect.getsource(ProcessorClass.parallel_find_primes)
        no_trial_division = 'for i in range(2, num)' not in prime_method
        assert has_sieve and no_trial_division, \
            "Should use Sieve of Eratosthenes, not trial division"
    
    def test_optimized_class_exists(self):
        assert OPTIMIZED, "Module should define OptimizedParallelProcessor class"


class TestParallelProcessor:
    
    def test_process_data_spawn_per_item(self):
        processor = ProcessorClass(num_workers=4)
        data = generate_test_data(50)
        results = processor.process_data_spawn_per_item(data)
        assert len(results) == 50
        processor.cleanup()
    
    def test_file_based_ipc_replacement(self):
        processor = ProcessorClass(num_workers=4)
        data = generate_test_data(100)
        results = processor.process_with_file_based_ipc(data)
        assert len(results) == 100
        processor.cleanup()
    
    def test_excessive_queue_ops_replacement(self):
        processor = ProcessorClass(num_workers=4)
        data = generate_test_data(200)
        results = processor.process_with_excessive_queue_ops(data)
        assert len(results) == 200
        processor.cleanup()
    
    def test_parallel_sum(self):
        processor = ProcessorClass(num_workers=4)
        data = generate_test_data(100)
        total = processor.parallel_sum_spawn_many(data)
        assert total == sum(data)
        processor.cleanup()
    
    def test_matrix_multiply_small(self):
        processor = ProcessorClass(num_workers=4)
        A = generate_test_matrix(5, 5)
        B = generate_test_matrix(5, 5)
        result = processor.parallel_matrix_multiply(A, B)
        assert len(result) == 5
        assert len(result[0]) == 5
        processor.cleanup()
    
    def test_word_count(self):
        processor = ProcessorClass(num_workers=4)
        text = generate_test_text(500)
        word_counts = processor.map_reduce_word_count(text)
        assert len(word_counts) > 0
        assert isinstance(word_counts, dict)
        processor.cleanup()
    
    def test_find_primes_small(self):
        processor = ProcessorClass(num_workers=4)
        primes = processor.parallel_find_primes(100)
        expected_primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]
        assert primes == expected_primes
        processor.cleanup()
    
    def test_pipeline(self):
        processor = ProcessorClass(num_workers=4)
        data = generate_test_data(50)
        results = processor.run_pipeline(data)
        assert len(results) == 50
        expected_first = ((1 * 2) + 10) ** 2
        assert results[0] == expected_first
        processor.cleanup()
    
    def test_batch_process_with_manager(self):
        processor = ProcessorClass(num_workers=4)
        batches = [generate_test_data(20) for _ in range(5)]
        results = processor.batch_process_with_manager(batches)
        assert len(results) == 100
        processor.cleanup()
    
    def test_compute_statistics(self):
        processor = ProcessorClass(num_workers=4)
        data = [1, 2, 3, 4, 5]
        stats = processor.compute_statistics_sequential(data)
        assert stats["mean"] == 3.0
        assert stats["median"] == 3.0
        assert stats["variance"] == 2.0
        processor.cleanup()
