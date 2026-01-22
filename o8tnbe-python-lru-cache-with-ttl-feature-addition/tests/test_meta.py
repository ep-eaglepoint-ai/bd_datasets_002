"""Meta tests to verify test infrastructure and compare implementations."""
import sys
import os
import time
import pytest
import importlib.util


def test_test_infrastructure():
    """Test that the test infrastructure is working correctly."""
    # Test that we can import from both repositories
    before_spec = importlib.util.spec_from_file_location(
        "before_profile_service", 
        os.path.join(os.path.dirname(__file__), '../repository_before/profile_service.py')
    )
    before_module = importlib.util.module_from_spec(before_spec)
    before_spec.loader.exec_module(before_module)
    
    after_spec = importlib.util.spec_from_file_location(
        "after_profile_service", 
        os.path.join(os.path.dirname(__file__), '../repository_after/profile_service.py')
    )
    after_module = importlib.util.module_from_spec(after_spec)
    after_spec.loader.exec_module(after_module)
    
    # Both modules should have the decorator
    assert hasattr(before_module, 'lru_cache_with_ttl')
    assert hasattr(after_module, 'lru_cache_with_ttl')
    
    # Both modules should have CacheStats
    assert hasattr(before_module, 'CacheStats')
    assert hasattr(after_module, 'CacheStats')


def test_before_vs_after_comparison():
    """Compare before and after implementations."""
    # Load before implementation
    before_spec = importlib.util.spec_from_file_location(
        "before_profile_service", 
        os.path.join(os.path.dirname(__file__), '../repository_before/profile_service.py')
    )
    before_module = importlib.util.module_from_spec(before_spec)
    before_spec.loader.exec_module(before_module)
    
    @before_module.lru_cache_with_ttl(maxsize=2, ttl_seconds=1)
    def before_func(x):
        return x * 2
    
    # Before implementation should not have cache methods
    assert not hasattr(before_func, 'cache_info')
    assert not hasattr(before_func, 'cache_clear')
    
    # Load after implementation
    after_spec = importlib.util.spec_from_file_location(
        "after_profile_service", 
        os.path.join(os.path.dirname(__file__), '../repository_after/profile_service.py')
    )
    after_module = importlib.util.module_from_spec(after_spec)
    after_spec.loader.exec_module(after_module)
    
    @after_module.lru_cache_with_ttl(maxsize=2, ttl_seconds=1)
    def after_func(x):
        return x * 2
    
    # After implementation should have cache methods
    assert hasattr(after_func, 'cache_info')
    assert hasattr(after_func, 'cache_clear')
    
    # Test basic functionality difference
    call_count_after = 0
    
    @after_module.lru_cache_with_ttl(maxsize=2, ttl_seconds=60)
    def after_test(x):
        nonlocal call_count_after
        call_count_after += 1
        return x * 2
    
    # Call functions twice with same argument
    after_test(5)
    after_test(5)
    
    # After should call function once (with caching)
    assert call_count_after == 1
    
    # Verify after implementation statistics
    stats = after_test.cache_info()
    assert stats.hits == 1
    assert stats.misses == 1


def test_requirements_compliance():
    """Test that the after implementation meets all requirements."""
    # Load after implementation
    after_spec = importlib.util.spec_from_file_location(
        "after_profile_service", 
        os.path.join(os.path.dirname(__file__), '../repository_after/profile_service.py')
    )
    after_module = importlib.util.module_from_spec(after_spec)
    after_spec.loader.exec_module(after_module)
    
    # Requirement 1: LRU eviction policy
    @after_module.lru_cache_with_ttl(maxsize=2, ttl_seconds=60)
    def lru_test(x):
        return x * 2
    
    lru_test(1)
    lru_test(2)
    lru_test(1)  # Make 1 most recently used
    lru_test(3)  # Should evict 2
    
    stats = lru_test.cache_info()
    assert stats.evictions >= 1
    
    # Requirement 2: TTL expiration
    @after_module.lru_cache_with_ttl(maxsize=10, ttl_seconds=0.1)
    def ttl_test(x):
        return x * 2
    
    ttl_test(1)
    time.sleep(0.15)
    ttl_test(1)  # Should expire
    
    stats = ttl_test.cache_info()
    assert stats.expirations >= 1
    
    # Requirement 4: Argument normalization
    call_count = 0
    
    @after_module.lru_cache_with_ttl(maxsize=10, ttl_seconds=60)
    def norm_test_counting(a, b=2):
        nonlocal call_count
        call_count += 1
        return a + b
    
    norm_test_counting(1, b=2)
    norm_test_counting(1, 2)
    norm_test_counting(a=1, b=2)
    
    # Should be treated as same call due to normalization
    assert call_count == 1
    
    # Requirement 6: cache_info method
    assert hasattr(lru_test, 'cache_info')
    stats = lru_test.cache_info()
    assert hasattr(stats, 'hits')
    assert hasattr(stats, 'misses')
    assert hasattr(stats, 'evictions')
    assert hasattr(stats, 'expirations')
    
    # Requirement 7: cache_clear method
    assert hasattr(lru_test, 'cache_clear')
    lru_test.cache_clear()
    stats = lru_test.cache_info()
    assert stats.hits == 0
    assert stats.misses == 0
    assert stats.evictions == 0
    assert stats.expirations == 0


if __name__ == "__main__":
    test_test_infrastructure()
    test_before_vs_after_comparison()
    test_requirements_compliance()
    print("Meta tests completed.")