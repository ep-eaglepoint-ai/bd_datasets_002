import time
import threading
import json
import copy
import heapq
import re
from collections import OrderedDict, deque


class CacheEntry:
    __slots__ = ['key', 'original_key', 'value', 'created_at', 'last_accessed', 
                 'access_count', 'ttl_seconds', 'size', 'expiration_time']
    
    def __init__(self, key, original_key, value, ttl_seconds=None):
        self.key = key
        self.original_key = original_key
        self.value = value
        self.created_at = time.time()
        self.last_accessed = self.created_at
        self.access_count = 0
        self.ttl_seconds = ttl_seconds
        self.size = 0
        if ttl_seconds is not None:
            self.expiration_time = self.created_at + ttl_seconds
        else:
            self.expiration_time = None


class OptimizedCache:
    def __init__(self, max_size=1000, default_ttl=300, logging_enabled=True):
        self._cache = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
        self._logging_enabled = logging_enabled
        self._stats_log = deque(maxlen=10000)
        self._ttl_heap = []
        self._heap_counter = 0
    
    def _normalize_key(self, key):
        if isinstance(key, dict):
            return tuple(sorted((k, self._normalize_key(v)) for k, v in key.items()))
        elif isinstance(key, list):
            return tuple(self._normalize_key(item) for item in key)
        elif isinstance(key, (set, frozenset)):
            return frozenset(self._normalize_key(item) for item in key)
        else:
            return key
    
    def _needs_copy(self, value):
        return isinstance(value, (dict, list, set, bytearray))
    
    def _safe_copy(self, value):
        if self._needs_copy(value):
            return copy.deepcopy(value)
        return value
    
    def _calculate_entry_size(self, value):
        if isinstance(value, (dict, list)):
            return len(json.dumps(value))
        return len(str(value))
    
    def _is_expired(self, entry):
        if entry.expiration_time is None:
            return False
        return time.time() > entry.expiration_time
    
    def _log(self, message):
        if self._logging_enabled:
            self._stats_log.append(message)
    
    def _cleanup_heap(self, max_items=100):
        current_time = time.time()
        cleaned = 0
        while self._ttl_heap and cleaned < max_items:
            exp_time, counter, norm_key = self._ttl_heap[0]
            if exp_time > current_time:
                break
            heapq.heappop(self._ttl_heap)
            if norm_key in self._cache:
                entry = self._cache[norm_key]
                if entry.expiration_time is not None and entry.expiration_time <= current_time:
                    del self._cache[norm_key]
                    cleaned += 1
        return cleaned
    
    def get(self, key):
        with self._lock:
            norm_key = self._normalize_key(key)
            entry = self._cache.get(norm_key)
            
            if entry is None:
                self._misses += 1
                self._log(f"MISS: {key}")
                return None
            
            if self._is_expired(entry):
                del self._cache[norm_key]
                self._misses += 1
                self._log(f"EXPIRED: {key}")
                return None
            
            self._cache.move_to_end(norm_key)
            entry.last_accessed = time.time()
            entry.access_count += 1
            self._hits += 1
            self._log(f"HIT: {key}")
            
            return self._safe_copy(entry.value)
    
    def get_unsafe(self, key):
        with self._lock:
            norm_key = self._normalize_key(key)
            entry = self._cache.get(norm_key)
            
            if entry is None:
                self._misses += 1
                return None
            
            if self._is_expired(entry):
                del self._cache[norm_key]
                self._misses += 1
                return None
            
            self._cache.move_to_end(norm_key)
            entry.last_accessed = time.time()
            entry.access_count += 1
            self._hits += 1
            
            return entry.value
    
    def set(self, key, value, ttl_seconds=None):
        with self._lock:
            if ttl_seconds is None:
                ttl_seconds = self._default_ttl
            
            norm_key = self._normalize_key(key)
            
            if norm_key in self._cache:
                del self._cache[norm_key]
            
            while len(self._cache) >= self._max_size:
                evicted_key, evicted_entry = self._cache.popitem(last=False)
                self._log(f"EVICTED: {evicted_entry.original_key}")
            
            stored_value = self._safe_copy(value) if self._needs_copy(value) else value
            entry = CacheEntry(norm_key, key, stored_value, ttl_seconds)
            entry.size = self._calculate_entry_size(value)
            self._cache[norm_key] = entry
            
            if ttl_seconds is not None:
                self._heap_counter += 1
                heapq.heappush(self._ttl_heap, (entry.expiration_time, self._heap_counter, norm_key))
            
            self._log(f"SET: {key}")
    
    def delete(self, key):
        with self._lock:
            norm_key = self._normalize_key(key)
            if norm_key in self._cache:
                del self._cache[norm_key]
                self._log(f"DELETED: {key}")
                return True
            return False
    
    def clear(self):
        with self._lock:
            self._cache.clear()
            self._ttl_heap.clear()
            self._heap_counter = 0
            self._log("CLEARED")
    
    def cleanup_expired(self):
        with self._lock:
            expired_count = 0
            current_time = time.time()
            
            while self._ttl_heap:
                exp_time, counter, norm_key = self._ttl_heap[0]
                if exp_time > current_time:
                    break
                heapq.heappop(self._ttl_heap)
                if norm_key in self._cache:
                    entry = self._cache[norm_key]
                    if entry.expiration_time is not None and entry.expiration_time <= current_time:
                        del self._cache[norm_key]
                        expired_count += 1
            
            self._log(f"CLEANUP: removed {expired_count} entries")
            return expired_count
    
    def get_or_set(self, key, factory_func, ttl_seconds=None):
        value = self.get(key)
        if value is not None:
            return value
        
        value = factory_func()
        self.set(key, value, ttl_seconds)
        return value
    
    def get_many(self, keys):
        results = {}
        for key in keys:
            value = self.get(key)
            if isinstance(key, dict):
                key_str = json.dumps(key, sort_keys=True)
            elif isinstance(key, list):
                key_str = json.dumps(key)
            else:
                key_str = str(key)
            results[key_str] = value
        return results
    
    def set_many(self, items, ttl_seconds=None):
        for key, value in items.items():
            self.set(key, value, ttl_seconds)
    
    def keys(self):
        with self._lock:
            result = []
            current_time = time.time()
            for norm_key, entry in self._cache.items():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    result.append(self._safe_copy(entry.original_key))
            return result
    
    def values(self):
        with self._lock:
            result = []
            current_time = time.time()
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    result.append(self._safe_copy(entry.value))
            return result
    
    def items(self):
        with self._lock:
            result = []
            current_time = time.time()
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    result.append((self._safe_copy(entry.original_key), self._safe_copy(entry.value)))
            return result
    
    def size(self):
        with self._lock:
            current_time = time.time()
            count = 0
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    count += 1
            return count
    
    def total_memory_size(self):
        with self._lock:
            total = 0
            for entry in self._cache.values():
                total += entry.size
            return total
    
    def get_stats(self):
        with self._lock:
            total = self._hits + self._misses
            hit_rate = self._hits / total if total > 0 else 0
            
            return {
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": hit_rate,
                "size": self.size(),
                "total_memory": self.total_memory_size()
            }
    
    def find_by_prefix(self, prefix):
        with self._lock:
            results = []
            prefix_str = str(prefix)
            current_time = time.time()
            
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    key_str = str(entry.original_key)
                    if key_str.startswith(prefix_str):
                        results.append((self._safe_copy(entry.original_key), self._safe_copy(entry.value)))
            
            return results
    
    def find_by_pattern(self, pattern):
        with self._lock:
            results = []
            current_time = time.time()
            
            regex_pattern = ''
            i = 0
            while i < len(pattern):
                c = pattern[i]
                if c == '*':
                    regex_pattern += '.*'
                elif c == '?':
                    regex_pattern += '.'
                else:
                    regex_pattern += re.escape(c)
                i += 1
            
            compiled_pattern = re.compile('^' + regex_pattern + '$')
            
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    key_str = str(entry.original_key)
                    if compiled_pattern.match(key_str):
                        results.append((self._safe_copy(entry.original_key), self._safe_copy(entry.value)))
            
            return results
    
    def get_lru_entries(self, count):
        with self._lock:
            current_time = time.time()
            valid_entries = [
                entry for entry in self._cache.values()
                if entry.expiration_time is None or entry.expiration_time > current_time
            ]
            
            lru_entries = heapq.nsmallest(count, valid_entries, key=lambda e: e.last_accessed)
            
            return [
                {
                    "key": self._safe_copy(entry.original_key),
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count
                }
                for entry in lru_entries
            ]
    
    def get_mru_entries(self, count):
        with self._lock:
            current_time = time.time()
            valid_entries = [
                entry for entry in self._cache.values()
                if entry.expiration_time is None or entry.expiration_time > current_time
            ]
            
            mru_entries = heapq.nlargest(count, valid_entries, key=lambda e: e.last_accessed)
            
            return [
                {
                    "key": self._safe_copy(entry.original_key),
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count
                }
                for entry in mru_entries
            ]
    
    def get_most_accessed(self, count):
        with self._lock:
            current_time = time.time()
            valid_entries = [
                entry for entry in self._cache.values()
                if entry.expiration_time is None or entry.expiration_time > current_time
            ]
            
            most_accessed = heapq.nlargest(count, valid_entries, key=lambda e: e.access_count)
            
            return [
                {
                    "key": self._safe_copy(entry.original_key),
                    "access_count": entry.access_count
                }
                for entry in most_accessed
            ]
    
    def export_stats_log(self):
        with self._lock:
            return '\n'.join(self._stats_log) + ('\n' if self._stats_log else '')


UnoptimizedCache = OptimizedCache
