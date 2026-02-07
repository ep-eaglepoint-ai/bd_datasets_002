import time
import threading
from typing import Any, Callable, Optional
from functools import wraps
from dataclasses import dataclass
from datetime import datetime


@dataclass
class CacheStats:
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    expirations: int = 0


def lru_cache_with_ttl(maxsize: int = 128, ttl_seconds: float = 300.0):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


@lru_cache_with_ttl(maxsize=100, ttl_seconds=300)
def get_user_profile(user_id: str) -> dict:
    time.sleep(0.1)
    return {
        "user_id": user_id,
        "name": f"User {user_id}",
        "fetched_at": datetime.now().isoformat()
    }


@lru_cache_with_ttl(maxsize=50, ttl_seconds=60)
def compute_recommendations(user_id: str, category: str, limit: int = 10) -> list:
    time.sleep(0.2)
    return [f"item_{i}_{category}" for i in range(limit)]


if __name__ == "__main__":
    print(get_user_profile("user_123"))
    print(get_user_profile("user_123"))
    print(get_user_profile.cache_info())

