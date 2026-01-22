import time
import threading
import inspect
from typing import Any, Callable, Optional
from functools import wraps
from dataclasses import dataclass
from datetime import datetime
from collections import OrderedDict


@dataclass
class CacheStats:
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    expirations: int = 0


@dataclass
class CacheEntry:
    value: Any
    timestamp: float


def lru_cache_with_ttl(maxsize: int = 128, ttl_seconds: float = 300.0):
    def decorator(func: Callable) -> Callable:
        cache = OrderedDict()
        stats = CacheStats()
        lock = threading.Lock()
        
        # Get function signature for argument normalization
        sig = inspect.signature(func)
        
        def _make_key(*args, **kwargs):
            """Generate cache key from function arguments."""
            try:
                # Bind arguments to signature and apply defaults
                bound = sig.bind(*args, **kwargs)
                bound.apply_defaults()
                
                # Create hashable key from normalized arguments
                key_parts = []
                for name, value in bound.arguments.items():
                    # Test if value is hashable
                    try:
                        hash(value)
                        key_parts.append((name, value))
                    except TypeError:
                        # Value is not hashable, cannot cache
                        return None
                
                return tuple(key_parts)
            except (TypeError, ValueError):
                # Arguments cannot be hashed or bound
                return None
        
        def _is_expired(entry: CacheEntry) -> bool:
            """Check if cache entry is expired."""
            return time.time() - entry.timestamp > ttl_seconds
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = _make_key(*args, **kwargs)
            
            # If key cannot be generated, bypass cache
            if cache_key is None:
                with lock:
                    stats.misses += 1
                return func(*args, **kwargs)
            
            # Check cache for existing entry
            with lock:
                if cache_key in cache:
                    entry = cache[cache_key]
                    
                    # Check if entry is expired
                    if _is_expired(entry):
                        # Remove expired entry
                        del cache[cache_key]
                        stats.expirations += 1
                    else:
                        # Cache hit - move to end (most recently used)
                        cache.move_to_end(cache_key)
                        stats.hits += 1
                        return entry.value
                
                # Cache miss - will need to compute value
                stats.misses += 1
            
            # Compute value outside of lock to avoid blocking
            result = func(*args, **kwargs)
            
            # Store result in cache
            with lock:
                # Check if we need to evict entries
                while len(cache) >= maxsize:
                    # Remove least recently used entry
                    cache.popitem(last=False)
                    stats.evictions += 1
                
                # Add new entry
                cache[cache_key] = CacheEntry(result, time.time())
                # Move to end (most recently used)
                cache.move_to_end(cache_key)
            
            return result
        
        def cache_info():
            """Return current cache statistics."""
            with lock:
                return CacheStats(
                    hits=stats.hits,
                    misses=stats.misses,
                    evictions=stats.evictions,
                    expirations=stats.expirations
                )
        
        def cache_clear():
            """Clear all cache entries and reset statistics."""
            with lock:
                cache.clear()
                stats.hits = 0
                stats.misses = 0
                stats.evictions = 0
                stats.expirations = 0
        
        # Attach methods to wrapper function
        wrapper.cache_info = cache_info
        wrapper.cache_clear = cache_clear
        
        return wrapper
    return decorator


@lru_cache_with_ttl(maxsize=100, ttl_seconds=300)
def get_user_profile(user_id: str) -> dict:
    """Fetch user profile data."""
    time.sleep(0.1)
    return {
        "user_id": user_id,
        "name": f"User {user_id}",
        "fetched_at": datetime.now().isoformat()
    }


@lru_cache_with_ttl(maxsize=50, ttl_seconds=60)
def compute_recommendations(user_id: str, category: str, limit: int = 10) -> list:
    """Compute user recommendations."""
    time.sleep(0.2)
    return [f"item_{i}_{category}" for i in range(limit)]


if __name__ == "__main__":
    print(get_user_profile("user_123"))
    print(get_user_profile("user_123"))
    print(get_user_profile.cache_info())