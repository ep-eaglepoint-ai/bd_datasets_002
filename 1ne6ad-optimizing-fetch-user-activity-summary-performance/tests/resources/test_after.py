"""Tests for repository_after implementation."""
import sys
import os
import time
import threading
import pytest
import psutil
import importlib.util
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor

# Add repository_after to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../repository_after'))

from fetch_user_activity_summary import fetch_user_activity_summary
from db import DB


class TestAfterImplementation:
    """Test the optimized implementation."""
    
    def setup_method(self):
        """Set up test data before each test."""
        self.db = DB()
        self._seed_test_data()
    
    def teardown_method(self):
        """Clean up after each test."""
        self._cleanup_test_data()
    
    def _seed_test_data(self):
        """Seed the database with test data."""
        with self.db.conn.cursor() as cur:
            # Clear existing data
            cur.execute("DELETE FROM events")
            
            # Insert test data for user 1 (high volume user)
            test_events = []
            for i in range(50000):  # Even larger dataset to test scalability
                event_type = ['click', 'view', 'purchase'][i % 3]
                price = 10.50 if event_type == 'purchase' else None
                metadata = {'price': price} if price else {}
                test_events.append((i, 1, event_type, metadata))
            
            # Insert some duplicate events to test de-duplication
            for i in range(1000):
                test_events.append((i, 1, 'click', {}))  # Duplicates of first 1000 events
            
            # Insert test data for user 2 (medium volume)
            for i in range(10000):
                event_type = ['click', 'view'][i % 2]
                test_events.append((50000 + i, 2, event_type, {}))
            
            # Insert test data for user 3 (low volume)
            test_events.extend([
                (100000, 3, 'click', {}),
                (100001, 3, 'view', {}),
                (100002, 3, 'purchase', {'price': 25.99})
            ])
            
            # Insert test data for user 4 (large volume for scalability test)
            for i in range(1000000):  # 1M events for scalability test
                event_type = ['click', 'view', 'purchase'][i % 3]
                price = 15.75 if event_type == 'purchase' else None
                metadata = {'price': price} if price else {}
                test_events.append((200000 + i, 4, event_type, metadata))
            
            # Bulk insert in batches to avoid memory issues
            batch_size = 10000
            for i in range(0, len(test_events), batch_size):
                batch = test_events[i:i + batch_size]
                cur.executemany(
                    "INSERT INTO events (id, user_id, type, metadata) VALUES (%s, %s, %s, %s)",
                    batch
                )
            
            self.db.conn.commit()
    
    def _cleanup_test_data(self):
        """Clean up test data."""
        with self.db.conn.cursor() as cur:
            cur.execute("DELETE FROM events")
            self.db.conn.commit()
    
    def test_functional_correctness(self):
        """Test that the after implementation produces correct results."""
        # Test user 3 (simple case)
        result = fetch_user_activity_summary(3)
        expected = {
            'click': 1,
            'view': 1, 
            'purchase': 1,
            'total_value': 25.99
        }
        assert result == expected, f"Expected {expected}, got {result}"
        
        # Test user 2 (no purchases)
        result = fetch_user_activity_summary(2)
        assert result['purchase'] == 0
        assert result['total_value'] == 0.0
        assert result['click'] + result['view'] == 10000
    
    def test_performance_improvement(self):
        """Test performance improvements in after implementation."""
        # Measure execution time for high-volume user
        start_time = time.time()
        result = fetch_user_activity_summary(1)
        execution_time = time.time() - start_time
        
        # Should be fast
        assert result is not None
        print(f"After implementation execution time: {execution_time:.4f}s")
        
        # Should meet performance target (this is a basic check)
        assert execution_time < 1.0, f"Execution time {execution_time:.4f}s exceeds 1 second"
    
    def test_memory_efficiency(self):
        """Test memory efficiency of after implementation."""
        process = psutil.Process()
        
        # Measure memory before
        mem_before = process.memory_info().rss
        
        # Execute function
        result = fetch_user_activity_summary(1)
        
        # Measure memory after
        mem_after = process.memory_info().rss
        memory_delta = mem_after - mem_before
        
        print(f"After implementation memory delta: {memory_delta} bytes")
        
        # Should use minimal memory
        assert result is not None
        # Memory usage should be reasonable (less than 128MB as per requirements)
        assert memory_delta < 128 * 1024 * 1024, f"Memory usage {memory_delta} bytes exceeds 128MB"
    
    def test_scalability(self):
        """Test scalability of after implementation."""
        # Test with user 4 (1M events) - this should still be fast
        start_time = time.time()
        result = fetch_user_activity_summary(4)
        execution_time = time.time() - start_time
        
        print(f"Scalability test (1M events) execution time: {execution_time:.4f}s")
        
        # Should handle 1M events efficiently
        assert result is not None
        assert execution_time < 2.0, f"Large dataset execution time {execution_time:.4f}s too slow"
        
        # Verify correctness
        expected_purchases = 1000000 // 3  # Approximately 333,333 purchases
        expected_total = expected_purchases * 15.75
        
        assert abs(result['purchase'] - expected_purchases) < 100  # Allow small variance
        assert abs(result['total_value'] - expected_total) < 1000  # Allow small variance
    
    def test_latency_target(self):
        """Test that p99 latency target is met."""
        # Run multiple iterations to test p99 latency
        execution_times = []
        
        for _ in range(100):
            start_time = time.time()
            result = fetch_user_activity_summary(1)
            execution_time = time.time() - start_time
            execution_times.append(execution_time)
            assert result is not None
        
        # Calculate p99 latency
        execution_times.sort()
        p99_latency = execution_times[98]  # 99th percentile (0-indexed)
        
        print(f"P99 latency: {p99_latency:.4f}s")
        
        # Should meet p99 target of <200ms
        assert p99_latency < 0.2, f"P99 latency {p99_latency:.4f}s exceeds 200ms target"
    
    def test_edge_cases(self):
        """Test edge cases for after implementation."""
        # Test non-existent user
        result = fetch_user_activity_summary(999999)
        expected = {'click': 0, 'view': 0, 'purchase': 0, 'total_value': 0.0}
        assert result == expected
        
        # Test user with no events
        with self.db.conn.cursor() as cur:
            cur.execute("DELETE FROM events WHERE user_id = 3")
            self.db.conn.commit()
        
        result = fetch_user_activity_summary(3)
        assert result == expected
    
    def test_data_integrity(self):
        """Test data integrity for after implementation."""
        result = fetch_user_activity_summary(1)
        
        # All values should be non-negative
        assert result['click'] >= 0
        assert result['view'] >= 0
        assert result['purchase'] >= 0
        assert result['total_value'] >= 0.0
        
        # Types should be correct
        assert isinstance(result['click'], int)
        assert isinstance(result['view'], int)
        assert isinstance(result['purchase'], int)
        assert isinstance(result['total_value'], float)
    
    def test_concurrent_access(self):
        """Test that the implementation handles concurrent access correctly."""
        def fetch_summary(user_id):
            return fetch_user_activity_summary(user_id)
        
        # Test concurrent access with multiple threads
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for _ in range(20):
                future = executor.submit(fetch_summary, 1)
                futures.append(future)
            
            results = [future.result() for future in futures]
        
        # All results should be identical
        first_result = results[0]
        for result in results[1:]:
            assert result == first_result, "Concurrent access produced different results"
    
    def test_constant_memory_usage(self):
        """Test that memory usage remains constant regardless of dataset size."""
        process = psutil.Process()
        
        # Test with small dataset (user 3)
        mem_before = process.memory_info().rss
        fetch_user_activity_summary(3)
        mem_after_small = process.memory_info().rss
        small_delta = mem_after_small - mem_before
        
        # Test with large dataset (user 4 - 1M events)
        mem_before = process.memory_info().rss
        fetch_user_activity_summary(4)
        mem_after_large = process.memory_info().rss
        large_delta = mem_after_large - mem_before
        
        print(f"Small dataset memory delta: {small_delta} bytes")
        print(f"Large dataset memory delta: {large_delta} bytes")
        
        # Memory usage should not scale linearly with dataset size
        # Allow some variance but large dataset shouldn't use significantly more memory
        assert large_delta < small_delta * 10, "Memory usage scales too much with dataset size"