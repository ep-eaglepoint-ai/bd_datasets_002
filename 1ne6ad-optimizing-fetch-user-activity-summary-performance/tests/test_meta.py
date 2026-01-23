"""Meta tests to verify test infrastructure and compare implementations."""
import sys
import os
import time
import pytest
import importlib.util
import psutil
import threading
from concurrent.futures import ThreadPoolExecutor


def test_test_infrastructure():
    """Test that the test infrastructure is working correctly."""
    # Test that we can import from both repositories
    before_spec = importlib.util.spec_from_file_location(
        "before_fetch", 
        os.path.join(os.path.dirname(__file__), '../repository_before/fetch_user_activity_summary.py')
    )
    before_module = importlib.util.module_from_spec(before_spec)
    before_spec.loader.exec_module(before_module)
    
    after_spec = importlib.util.spec_from_file_location(
        "after_fetch", 
        os.path.join(os.path.dirname(__file__), '../repository_after/fetch_user_activity_summary.py')
    )
    after_module = importlib.util.module_from_spec(after_spec)
    after_spec.loader.exec_module(after_module)
    
    # Both modules should have the function
    assert hasattr(before_module, 'fetch_user_activity_summary')
    assert hasattr(after_module, 'fetch_user_activity_summary')


def test_functional_parity():
    """Test that both implementations produce identical results."""
    # Load both implementations
    before_spec = importlib.util.spec_from_file_location(
        "before_fetch", 
        os.path.join(os.path.dirname(__file__), '../repository_before/fetch_user_activity_summary.py')
    )
    before_module = importlib.util.module_from_spec(before_spec)
    before_spec.loader.exec_module(before_module)
    
    after_spec = importlib.util.spec_from_file_location(
        "after_fetch", 
        os.path.join(os.path.dirname(__file__), '../repository_after/fetch_user_activity_summary.py')
    )
    after_module = importlib.util.module_from_spec(after_spec)
    after_spec.loader.exec_module(after_module)
    
    # Test with sample user IDs
    test_user_ids = [1, 2, 3, 999, 1000]
    
    for user_id in test_user_ids:
        before_result = before_module.fetch_user_activity_summary(user_id)
        after_result = after_module.fetch_user_activity_summary(user_id)
        
        # Results should be identical
        assert before_result == after_result, f"Results differ for user_id {user_id}: before={before_result}, after={after_result}"


def test_performance_comparison():
    """Compare performance between before and after implementations."""
    # Load both implementations
    before_spec = importlib.util.spec_from_file_location(
        "before_fetch", 
        os.path.join(os.path.dirname(__file__), '../repository_before/fetch_user_activity_summary.py')
    )
    before_module = importlib.util.module_from_spec(before_spec)
    before_spec.loader.exec_module(before_module)
    
    after_spec = importlib.util.spec_from_file_location(
        "after_fetch", 
        os.path.join(os.path.dirname(__file__), '../repository_after/fetch_user_activity_summary.py')
    )
    after_module = importlib.util.module_from_spec(after_spec)
    after_spec.loader.exec_module(after_module)
    
    # Test performance with a user that has many events
    test_user_id = 1
    iterations = 10
    
    # Measure before implementation
    start_time = time.time()
    for _ in range(iterations):
        before_module.fetch_user_activity_summary(test_user_id)
    before_time = time.time() - start_time
    
    # Measure after implementation
    start_time = time.time()
    for _ in range(iterations):
        after_module.fetch_user_activity_summary(test_user_id)
    after_time = time.time() - start_time
    
    # After should be faster or at least not significantly slower
    print(f"Before implementation: {before_time:.4f}s for {iterations} iterations")
    print(f"After implementation: {after_time:.4f}s for {iterations} iterations")
    print(f"Performance ratio: {before_time/after_time:.2f}x")


def test_memory_comparison():
    """Compare memory usage between implementations."""
    # This is a basic memory comparison test
    # In a real scenario, you'd use more sophisticated memory profiling
    
    process = psutil.Process()
    
    # Load both implementations
    before_spec = importlib.util.spec_from_file_location(
        "before_fetch", 
        os.path.join(os.path.dirname(__file__), '../repository_before/fetch_user_activity_summary.py')
    )
    before_module = importlib.util.module_from_spec(before_spec)
    before_spec.loader.exec_module(before_module)
    
    after_spec = importlib.util.spec_from_file_location(
        "after_fetch", 
        os.path.join(os.path.dirname(__file__), '../repository_after/fetch_user_activity_summary.py')
    )
    after_module = importlib.util.module_from_spec(after_spec)
    after_spec.loader.exec_module(after_module)
    
    # Test with user that has many events
    test_user_id = 1
    
    # Measure memory for before implementation
    mem_before = process.memory_info().rss
    before_module.fetch_user_activity_summary(test_user_id)
    mem_after_before = process.memory_info().rss
    before_memory_delta = mem_after_before - mem_before
    
    # Measure memory for after implementation  
    mem_before = process.memory_info().rss
    after_module.fetch_user_activity_summary(test_user_id)
    mem_after_after = process.memory_info().rss
    after_memory_delta = mem_after_after - mem_before
    
    print(f"Before implementation memory delta: {before_memory_delta} bytes")
    print(f"After implementation memory delta: {after_memory_delta} bytes")