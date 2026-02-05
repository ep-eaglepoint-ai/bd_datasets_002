import pytest
from cache import DistributedCache


@pytest.fixture
def cache():
    """Create a fresh cache instance for each test."""
    c = DistributedCache(max_size=100)
    yield c


@pytest.fixture
def small_cache():
    """Create a small cache (max_size=3) for LRU eviction tests."""
    c = DistributedCache(max_size=3)
    yield c

