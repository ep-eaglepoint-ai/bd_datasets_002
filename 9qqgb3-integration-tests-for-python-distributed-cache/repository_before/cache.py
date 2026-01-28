import json
import threading
import time
from typing import Any, Optional, List, Dict
from collections import OrderedDict
import fnmatch


class DistributedCache:
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = threading.RLock()
        self._stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
        }
        self._cleanup_thread = threading.Thread(target=self._cleanup_expired, daemon=True)
        self._cleanup_thread.start()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                self._stats['misses'] += 1
                return None
            
            entry = self._cache[key]
            
            # Check TTL expiration
            if entry.get('ttl') is not None:
                elapsed = time.time() - entry['created_at']
                if elapsed > entry['ttl']:
                    del self._cache[key]
                    self._stats['misses'] += 1
                    return None
            
            # Update access count and move to end (LRU)
            entry['access_count'] += 1
            self._cache.move_to_end(key)
            self._stats['hits'] += 1
            
            return entry['value']

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        with self._lock:
            # Evict if at capacity and key is new
            if key not in self._cache and len(self._cache) >= self.max_size:
                self._evict_lru()
            
            self._cache[key] = {
                'value': value,
                'ttl': ttl,
                'created_at': time.time(),
                'access_count': 0,
            }
            self._cache.move_to_end(key)
            return True

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def exists(self, key: str) -> bool:
        with self._lock:
            if key not in self._cache:
                return False
            
            entry = self._cache[key]
            
            # Check TTL expiration
            if entry.get('ttl') is not None:
                elapsed = time.time() - entry['created_at']
                if elapsed > entry['ttl']:
                    del self._cache[key]
                    return False
            
            return True

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            self._stats = {
                'hits': 0,
                'misses': 0,
                'evictions': 0,
            }

    def increment(self, key: str, amount: int = 1) -> int:
        with self._lock:
            if key not in self._cache:
                self.set(key, 0)
            
            entry = self._cache[key]
            
            if not isinstance(entry['value'], (int, float)):
                raise ValueError(f"Cannot increment non-numeric value")
            
            entry['value'] += amount
            entry['access_count'] += 1
            self._cache.move_to_end(key)
            
            return entry['value']

    def decrement(self, key: str, amount: int = 1) -> int:
        return self.increment(key, -amount)

    def stats(self) -> Dict[str, int]:
        with self._lock:
            return {
                **self._stats,
                'size': len(self._cache),
            }

    def keys(self, pattern: str = "*") -> List[str]:
        with self._lock:
            all_keys = list(self._cache.keys())
            
            if pattern == "*":
                return all_keys
            
            return [key for key in all_keys if fnmatch.fnmatch(key, pattern)]

    def delete_pattern(self, pattern: str) -> int:
        with self._lock:
            matching_keys = self.keys(pattern)
            for key in matching_keys:
                del self._cache[key]
            return len(matching_keys)

    def save(self, filepath: str) -> bool:
        with self._lock:
            try:
                # Filter out expired entries
                current_time = time.time()
                active_entries = {}
                
                for key, entry in self._cache.items():
                    if entry.get('ttl') is not None:
                        elapsed = current_time - entry['created_at']
                        if elapsed > entry['ttl']:
                            continue
                    active_entries[key] = entry
                
                with open(filepath, 'w') as f:
                    json.dump(active_entries, f, indent=2)
                
                return True
            except Exception:
                return False

    def load(self, filepath: str) -> bool:
        with self._lock:
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                
                self._cache.clear()
                
                for key, entry in data.items():
                    self._cache[key] = entry
                
                return True
            except Exception:
                return False

    def _evict_lru(self) -> None:
        if self._cache:
            lru_key = next(iter(self._cache))
            del self._cache[lru_key]
            self._stats['evictions'] += 1

    def _cleanup_expired(self) -> None:
        while True:
            time.sleep(60)
            with self._lock:
                current_time = time.time()
                expired_keys = []
                
                for key, entry in self._cache.items():
                    if entry.get('ttl') is not None:
                        elapsed = current_time - entry['created_at']
                        if elapsed > entry['ttl']:
                            expired_keys.append(key)
                
                for key in expired_keys:
                    del self._cache[key]

