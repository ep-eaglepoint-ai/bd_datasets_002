import multiprocessing
import time
import pickle
import json
import os
import tempfile
from multiprocessing import Process, Queue, Lock, Manager
import math


class DataChunk:
    def __init__(self, chunk_id, data):
        self.chunk_id = chunk_id
        self.data = data
        self.processed = False
        self.result = None


class UnoptimizedParallelProcessor:
    def __init__(self, num_workers=4):
        self.num_workers = num_workers
        self.results = []
        self.lock = Lock()
        self.temp_files = []
    
    def process_single_item(self, item):
        result = item * item + math.sin(item) * math.cos(item)
        time.sleep(0.001)
        return result
    
    def worker_process_one_item(self, item, result_queue):
        result = self.process_single_item(item)
        result_queue.put(result)
    
    def process_data_spawn_per_item(self, data):
        result_queue = Queue()
        processes = []
        
        for item in data:
            p = Process(target=self.worker_process_one_item, args=(item, result_queue))
            p.start()
            processes.append(p)
        
        for p in processes:
            p.join()
        
        results = []
        while not result_queue.empty():
            results.append(result_queue.get())
        
        return results
    
    def serialize_to_file(self, data, filename):
        with open(filename, 'w') as f:
            json.dump(data, f)
        self.temp_files.append(filename)
    
    def deserialize_from_file(self, filename):
        with open(filename, 'r') as f:
            return json.load(f)
    
    def worker_with_file_io(self, input_file, output_file, lock):
        data = self.deserialize_from_file(input_file)
        
        results = []
        for item in data:
            result = self.process_single_item(item)
            results.append(result)
        
        with lock:
            self.serialize_to_file(results, output_file)
    
    def process_with_file_based_ipc(self, data, chunk_size=10):
        temp_dir = tempfile.mkdtemp()
        input_files = []
        output_files = []
        
        chunks = []
        for i in range(0, len(data), chunk_size):
            chunks.append(data[i:i + chunk_size])
        
        for i, chunk in enumerate(chunks):
            input_file = os.path.join(temp_dir, f"input_{i}.json")
            output_file = os.path.join(temp_dir, f"output_{i}.json")
            self.serialize_to_file(chunk, input_file)
            input_files.append(input_file)
            output_files.append(output_file)
        
        lock = Lock()
        processes = []
        
        for i in range(len(chunks)):
            p = Process(
                target=self.worker_with_file_io,
                args=(input_files[i], output_files[i], lock)
            )
            p.start()
            processes.append(p)
        
        for p in processes:
            p.join()
        
        all_results = []
        for output_file in output_files:
            if os.path.exists(output_file):
                chunk_results = self.deserialize_from_file(output_file)
                for r in chunk_results:
                    all_results.append(r)
        
        for f in input_files + output_files:
            if os.path.exists(f):
                os.remove(f)
        os.rmdir(temp_dir)
        
        return all_results
    
    def worker_with_queue_per_item(self, input_queue, output_queue, lock):
        while True:
            try:
                item = input_queue.get(timeout=1)
                if item is None:
                    break
                
                result = self.process_single_item(item)
                
                with lock:
                    output_queue.put(result)
            except:
                break
    
    def process_with_excessive_queue_ops(self, data):
        input_queue = Queue()
        output_queue = Queue()
        lock = Lock()
        
        for item in data:
            input_queue.put(item)
        
        for _ in range(self.num_workers):
            input_queue.put(None)
        
        processes = []
        for _ in range(self.num_workers):
            p = Process(
                target=self.worker_with_queue_per_item,
                args=(input_queue, output_queue, lock)
            )
            p.start()
            processes.append(p)
        
        for p in processes:
            p.join()
        
        results = []
        while not output_queue.empty():
            results.append(output_queue.get())
        
        return results
    
    def compute_statistics_sequential(self, data):
        total = 0
        for item in data:
            total = total + item
        mean = total / len(data)
        
        variance_sum = 0
        for item in data:
            diff = item - mean
            variance_sum = variance_sum + diff * diff
        variance = variance_sum / len(data)
        
        sorted_data = []
        for item in data:
            sorted_data.append(item)
        
        n = len(sorted_data)
        for i in range(n):
            for j in range(0, n - i - 1):
                if sorted_data[j] > sorted_data[j + 1]:
                    temp = sorted_data[j]
                    sorted_data[j] = sorted_data[j + 1]
                    sorted_data[j + 1] = temp
        
        if n % 2 == 0:
            median = (sorted_data[n // 2 - 1] + sorted_data[n // 2]) / 2
        else:
            median = sorted_data[n // 2]
        
        return {"mean": mean, "variance": variance, "median": median}
    
    def parallel_sum_worker(self, data_chunk, result_queue):
        total = 0
        for item in data_chunk:
            total = total + item
        result_queue.put(total)
    
    def parallel_sum_spawn_many(self, data, chunk_size=5):
        chunks = []
        for i in range(0, len(data), chunk_size):
            chunks.append(data[i:i + chunk_size])
        
        result_queue = Queue()
        processes = []
        
        for chunk in chunks:
            p = Process(target=self.parallel_sum_worker, args=(chunk, result_queue))
            p.start()
            processes.append(p)
        
        for p in processes:
            p.join()
        
        partial_sums = []
        while not result_queue.empty():
            partial_sums.append(result_queue.get())
        
        total = 0
        for s in partial_sums:
            total = total + s
        
        return total
    
    def matrix_multiply_element(self, A, B, i, j, result_queue):
        n = len(A[0])
        value = 0
        for k in range(n):
            value = value + A[i][k] * B[k][j]
        result_queue.put((i, j, value))
    
    def parallel_matrix_multiply(self, A, B):
        rows_a = len(A)
        cols_b = len(B[0])
        
        result = []
        for i in range(rows_a):
            row = []
            for j in range(cols_b):
                row.append(0)
            result.append(row)
        
        result_queue = Queue()
        processes = []
        
        for i in range(rows_a):
            for j in range(cols_b):
                p = Process(
                    target=self.matrix_multiply_element,
                    args=(A, B, i, j, result_queue)
                )
                p.start()
                processes.append(p)
        
        for p in processes:
            p.join()
        
        while not result_queue.empty():
            i, j, value = result_queue.get()
            result[i][j] = value
        
        return result
    
    def map_reduce_word_count_mapper(self, text_chunk, result_queue):
        words = text_chunk.split()
        word_counts = {}
        for word in words:
            word_lower = ""
            for c in word:
                if c.isalpha():
                    word_lower = word_lower + c.lower()
            if word_lower:
                if word_lower in word_counts:
                    word_counts[word_lower] = word_counts[word_lower] + 1
                else:
                    word_counts[word_lower] = 1
        result_queue.put(word_counts)
    
    def map_reduce_word_count(self, text, chunk_size=100):
        words = text.split()
        chunks = []
        current_chunk = ""
        word_count = 0
        
        for word in words:
            current_chunk = current_chunk + " " + word
            word_count = word_count + 1
            if word_count >= chunk_size:
                chunks.append(current_chunk)
                current_chunk = ""
                word_count = 0
        
        if current_chunk:
            chunks.append(current_chunk)
        
        result_queue = Queue()
        processes = []
        
        for chunk in chunks:
            p = Process(
                target=self.map_reduce_word_count_mapper,
                args=(chunk, result_queue)
            )
            p.start()
            processes.append(p)
        
        for p in processes:
            p.join()
        
        partial_counts = []
        while not result_queue.empty():
            partial_counts.append(result_queue.get())
        
        final_counts = {}
        for partial in partial_counts:
            for word, count in partial.items():
                if word in final_counts:
                    final_counts[word] = final_counts[word] + count
                else:
                    final_counts[word] = count
        
        return final_counts
    
    def find_primes_worker(self, start, end, result_queue):
        primes = []
        for num in range(start, end):
            if num < 2:
                continue
            is_prime = True
            for i in range(2, num):
                if num % i == 0:
                    is_prime = False
                    break
            if is_prime:
                primes.append(num)
        result_queue.put(primes)
    
    def parallel_find_primes(self, limit):
        chunk_size = limit // self.num_workers
        if chunk_size < 1:
            chunk_size = 1
        
        result_queue = Queue()
        processes = []
        
        for i in range(self.num_workers):
            start = i * chunk_size
            end = (i + 1) * chunk_size if i < self.num_workers - 1 else limit
            p = Process(target=self.find_primes_worker, args=(start, end, result_queue))
            p.start()
            processes.append(p)
        
        for p in processes:
            p.join()
        
        all_primes = []
        while not result_queue.empty():
            chunk_primes = result_queue.get()
            for prime in chunk_primes:
                all_primes.append(prime)
        
        n = len(all_primes)
        for i in range(n):
            for j in range(0, n - i - 1):
                if all_primes[j] > all_primes[j + 1]:
                    temp = all_primes[j]
                    all_primes[j] = all_primes[j + 1]
                    all_primes[j + 1] = temp
        
        return all_primes
    
    def pipeline_stage_1(self, data, output_queue):
        for item in data:
            processed = item * 2
            output_queue.put(processed)
        output_queue.put(None)
    
    def pipeline_stage_2(self, input_queue, output_queue):
        while True:
            item = input_queue.get()
            if item is None:
                output_queue.put(None)
                break
            processed = item + 10
            output_queue.put(processed)
    
    def pipeline_stage_3(self, input_queue, results_list, lock):
        while True:
            item = input_queue.get()
            if item is None:
                break
            processed = item * item
            with lock:
                results_list.append(processed)
    
    def run_pipeline(self, data):
        manager = Manager()
        results_list = manager.list()
        lock = Lock()
        
        queue_1_2 = Queue()
        queue_2_3 = Queue()
        
        p1 = Process(target=self.pipeline_stage_1, args=(data, queue_1_2))
        p2 = Process(target=self.pipeline_stage_2, args=(queue_1_2, queue_2_3))
        p3 = Process(target=self.pipeline_stage_3, args=(queue_2_3, results_list, lock))
        
        p1.start()
        p2.start()
        p3.start()
        
        p1.join()
        p2.join()
        p3.join()
        
        final_results = []
        for r in results_list:
            final_results.append(r)
        
        return final_results
    
    def batch_process_with_manager(self, data_batches):
        manager = Manager()
        shared_results = manager.dict()
        shared_counter = manager.Value('i', 0)
        lock = Lock()
        
        def worker(batch_id, batch, shared_results, shared_counter, lock):
            results = []
            for item in batch:
                result = self.process_single_item(item)
                results.append(result)
            
            with lock:
                shared_results[batch_id] = results
                shared_counter.value = shared_counter.value + 1
        
        processes = []
        for i, batch in enumerate(data_batches):
            p = Process(
                target=worker,
                args=(i, batch, shared_results, shared_counter, lock)
            )
            p.start()
            processes.append(p)
        
        for p in processes:
            p.join()
        
        all_results = []
        for i in range(len(data_batches)):
            if i in shared_results:
                for r in shared_results[i]:
                    all_results.append(r)
        
        return all_results
    
    def cleanup(self):
        for f in self.temp_files:
            if os.path.exists(f):
                os.remove(f)


def generate_test_data(size):
    data = []
    for i in range(size):
        data.append(i + 1)
    return data


def generate_test_matrix(rows, cols):
    matrix = []
    for i in range(rows):
        row = []
        for j in range(cols):
            row.append((i + 1) * (j + 1))
        matrix.append(row)
    return matrix


def generate_test_text(word_count):
    sample_words = ["the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog", 
                    "python", "programming", "parallel", "processing", "data", "analysis"]
    text = ""
    for i in range(word_count):
        word = sample_words[i % len(sample_words)]
        text = text + word + " "
    return text


def main():
    processor = UnoptimizedParallelProcessor(num_workers=4)
    
    print("=" * 60)
    print("UNOPTIMIZED PARALLEL PROCESSOR BENCHMARK")
    print("=" * 60)
    
    print("\n1. Testing spawn-per-item processing...")
    data = generate_test_data(50)
    start = time.time()
    results = processor.process_data_spawn_per_item(data)
    end = time.time()
    print(f"   Processed {len(data)} items in {end - start:.4f} seconds")
    print(f"   Results count: {len(results)}")
    
    print("\n2. Testing file-based IPC...")
    data = generate_test_data(100)
    start = time.time()
    results = processor.process_with_file_based_ipc(data)
    end = time.time()
    print(f"   Processed {len(data)} items in {end - start:.4f} seconds")
    
    print("\n3. Testing excessive queue operations...")
    data = generate_test_data(200)
    start = time.time()
    results = processor.process_with_excessive_queue_ops(data)
    end = time.time()
    print(f"   Processed {len(data)} items in {end - start:.4f} seconds")
    
    print("\n4. Testing parallel sum with many spawns...")
    data = generate_test_data(100)
    start = time.time()
    total = processor.parallel_sum_spawn_many(data)
    end = time.time()
    print(f"   Sum of {len(data)} items = {total} in {end - start:.4f} seconds")
    
    print("\n5. Testing parallel matrix multiplication...")
    A = generate_test_matrix(5, 5)
    B = generate_test_matrix(5, 5)
    start = time.time()
    result = processor.parallel_matrix_multiply(A, B)
    end = time.time()
    print(f"   Multiplied 5x5 matrices in {end - start:.4f} seconds")
    
    print("\n6. Testing map-reduce word count...")
    text = generate_test_text(500)
    start = time.time()
    word_counts = processor.map_reduce_word_count(text)
    end = time.time()
    print(f"   Counted words in {end - start:.4f} seconds")
    print(f"   Unique words: {len(word_counts)}")
    
    print("\n7. Testing parallel prime finding...")
    start = time.time()
    primes = processor.parallel_find_primes(500)
    end = time.time()
    print(f"   Found {len(primes)} primes up to 500 in {end - start:.4f} seconds")
    
    print("\n8. Testing pipeline processing...")
    data = generate_test_data(50)
    start = time.time()
    results = processor.run_pipeline(data)
    end = time.time()
    print(f"   Pipeline processed {len(data)} items in {end - start:.4f} seconds")
    
    print("\n9. Testing batch processing with manager...")
    batches = [generate_test_data(20) for _ in range(5)]
    start = time.time()
    results = processor.batch_process_with_manager(batches)
    end = time.time()
    print(f"   Batch processed {len(results)} items in {end - start:.4f} seconds")
    
    processor.cleanup()
    
    print("\n" + "=" * 60)
    print("BENCHMARK COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()