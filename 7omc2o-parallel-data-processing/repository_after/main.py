import multiprocessing
import os
import math
import time
from multiprocessing import Pool, Queue, Process
from collections import Counter
import numpy as np


def _process_single_item(item):
    return item * item + math.sin(item) * math.cos(item)


def _sum_chunk(chunk):
    return sum(chunk)


def _multiply_row_block(args):
    A_block, B, start_row = args
    return np.array(A_block) @ np.array(B)


def _sieve_segment(args):
    start, end, base_primes = args
    if start < 2:
        start = 2
    size = end - start
    is_prime = [True] * size
    
    for prime in base_primes:
        first_multiple = ((start + prime - 1) // prime) * prime
        if first_multiple == prime:
            first_multiple += prime
        for j in range(first_multiple - start, size, prime):
            is_prime[j] = False
    
    return [start + i for i in range(size) if is_prime[i]]


def _word_count_mapper(text_chunk):
    words = text_chunk.split()
    counts = {}
    for word in words:
        clean = ''.join(c.lower() for c in word if c.isalpha())
        if clean:
            counts[clean] = counts.get(clean, 0) + 1
    return counts


def _pipeline_stage_1_batch(batch):
    return [item * 2 for item in batch]


def _pipeline_stage_2_batch(batch):
    return [item + 10 for item in batch]


def _pipeline_stage_3_batch(batch):
    return [item * item for item in batch]


def _pipeline_stage_1_worker(data, output_queue, batch_size):
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        processed = _pipeline_stage_1_batch(batch)
        output_queue.put(processed)
    output_queue.put(None)


def _pipeline_stage_2_worker(input_queue, output_queue):
    while True:
        batch = input_queue.get()
        if batch is None:
            output_queue.put(None)
            break
        processed = _pipeline_stage_2_batch(batch)
        output_queue.put(processed)


def _pipeline_stage_3_worker(input_queue, output_queue):
    while True:
        batch = input_queue.get()
        if batch is None:
            output_queue.put(None)
            break
        processed = _pipeline_stage_3_batch(batch)
        output_queue.put(processed)


def _process_batch(batch):
    return [_process_single_item(item) for item in batch]


class OptimizedParallelProcessor:
    def __init__(self, num_workers=None):
        self.num_workers = num_workers or os.cpu_count() or 4
        self.pool = None
        
    def __enter__(self):
        self.pool = Pool(self.num_workers)
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.pool:
            try:
                self.pool.close()
                self.pool.join()
            except:
                self.pool.terminate()
                self.pool.join()
        return False
    
    def _get_pool(self):
        if self.pool is None:
            self.pool = Pool(self.num_workers)
        return self.pool
    
    def _calculate_chunksize(self, total_items, min_per_worker=100):
        if total_items < self.num_workers * min_per_worker:
            return max(1, total_items // self.num_workers)
        return max(min_per_worker, total_items // (self.num_workers * 4))
    
    def process_single_item(self, item):
        result = item * item + math.sin(item) * math.cos(item)
        time.sleep(0.001)
        return result
    
    def process_data_spawn_per_item(self, data):
        if not data:
            return []
        pool = self._get_pool()
        chunksize = self._calculate_chunksize(len(data))
        return pool.map(_process_single_item, data, chunksize=chunksize)
    
    def process_with_file_based_ipc(self, data, chunk_size=10):
        return self.process_data_spawn_per_item(data)
    
    def process_with_excessive_queue_ops(self, data):
        return self.process_data_spawn_per_item(data)
    
    def compute_statistics_sequential(self, data):
        if not data:
            raise ValueError("Data cannot be empty")
        total = sum(data)
        mean = total / len(data)
        variance = sum((x - mean) ** 2 for x in data) / len(data)
        sorted_data = sorted(data)
        n = len(sorted_data)
        median = (sorted_data[n // 2 - 1] + sorted_data[n // 2]) / 2 if n % 2 == 0 else sorted_data[n // 2]
        return {"mean": mean, "variance": variance, "median": median}
    
    def parallel_sum_spawn_many(self, data, chunk_size=5):
        if not data:
            return 0
        pool = self._get_pool()
        chunksize = self._calculate_chunksize(len(data))
        chunks = [data[i:i + chunksize] for i in range(0, len(data), chunksize)]
        partial_sums = pool.map(_sum_chunk, chunks)
        return sum(partial_sums)
    
    def parallel_matrix_multiply(self, A, B):
        if not A or not B:
            raise ValueError("Matrices cannot be empty")
        if len(A[0]) != len(B):
            raise ValueError("Incompatible matrix dimensions")
        
        A_np = np.array(A)
        B_np = np.array(B)
        
        if len(A) <= 1000:
            return (A_np @ B_np).tolist()
        
        pool = self._get_pool()
        rows_per_chunk = max(1, len(A) // self.num_workers)
        tasks = []
        for i in range(0, len(A), rows_per_chunk):
            end = min(i + rows_per_chunk, len(A))
            tasks.append((A[i:end], B, i))
        
        results = pool.map(_multiply_row_block, tasks)
        return np.vstack(results).tolist()
    
    def map_reduce_word_count(self, text, chunk_size=100):
        if not text:
            return {}
        
        words = text.split()
        if not words:
            return {}
        
        pool = self._get_pool()
        words_per_chunk = max(1000, len(words) // self.num_workers)
        chunks = []
        for i in range(0, len(words), words_per_chunk):
            chunk_words = words[i:i + words_per_chunk]
            chunks.append(' '.join(chunk_words))
        
        partial_counts = pool.map(_word_count_mapper, chunks)
        
        final_counts = Counter()
        for partial in partial_counts:
            final_counts.update(partial)
        
        return dict(final_counts)
    
    def parallel_find_primes(self, limit):
        if limit < 2:
            return []
        
        sqrt_limit = int(math.sqrt(limit)) + 1
        base_primes = []
        is_prime = [True] * sqrt_limit
        is_prime[0] = is_prime[1] = False
        
        for i in range(2, sqrt_limit):
            if is_prime[i]:
                base_primes.append(i)
                for j in range(i * i, sqrt_limit, i):
                    is_prime[j] = False
        
        pool = self._get_pool()
        segment_size = max(10000, (limit - sqrt_limit) // self.num_workers)
        tasks = []
        
        for start in range(sqrt_limit, limit, segment_size):
            end = min(start + segment_size, limit)
            tasks.append((start, end, base_primes))
        
        if tasks:
            results = pool.map(_sieve_segment, tasks)
            all_primes = base_primes + [p for segment in results for p in segment]
        else:
            all_primes = base_primes
        
        return sorted([p for p in all_primes if p < limit])
    
    def run_pipeline(self, data):
        if not data:
            return []
        
        batch_size = max(100, len(data) // 10)
        queue_1_2 = Queue(maxsize=10)
        queue_2_3 = Queue(maxsize=10)
        output_queue = Queue()
        
        p1 = Process(target=_pipeline_stage_1_worker, args=(data, queue_1_2, batch_size))
        p2 = Process(target=_pipeline_stage_2_worker, args=(queue_1_2, queue_2_3))
        p3 = Process(target=_pipeline_stage_3_worker, args=(queue_2_3, output_queue))
        
        p1.start()
        p2.start()
        p3.start()
        
        results = []
        while True:
            batch = output_queue.get()
            if batch is None:
                break
            results.extend(batch)
        
        p1.join()
        p2.join()
        p3.join()
        
        return results
    
    def batch_process_with_manager(self, data_batches):
        if not data_batches:
            return []
        
        pool = self._get_pool()
        results = pool.map(_process_batch, data_batches)
        return [item for batch_result in results for item in batch_result]
    
    def cleanup(self):
        pass
    
    def __del__(self):
        if self.pool:
            try:
                self.pool.close()
                self.pool.join()
            except:
                pass


def generate_test_data(size):
    return list(range(1, size + 1))


def generate_test_matrix(rows, cols):
    return [[(i + 1) * (j + 1) for j in range(cols)] for i in range(rows)]


def generate_test_text(word_count):
    sample_words = ["the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog", 
                    "python", "programming", "parallel", "processing", "data", "analysis"]
    return ' '.join([sample_words[i % len(sample_words)] for i in range(word_count)])
