import time
import threading
import copy
import heapq
import re
from collections import OrderedDict, deque


class CacheEntry:
    __slots__ = ('key', 'original_key', 'value', 'created_at', 'last_accessed', 'access_count', 'ttl_seconds', 'size', 'expiration_time')

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
        self._expiration_heap = []
        self._heap_counter = 0
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._logging_enabled = logging_enabled
        self._stats_log = deque(maxlen=10000)
        self._lock = threading.RLock()
        self.hits = 0
        self.misses = 0

    def _normalize_key(self, key):
        if isinstance(key, dict):
            return tuple(sorted((k, self._normalize_key(v)) for k, v in key.items()))
        elif isinstance(key, list):
            return tuple(self._normalize_key(item) for item in key)
        return key

    def _needs_copy(self, value):
        return isinstance(value, (dict, list, set, bytearray))

    def _copy_if_needed(self, value):
        if self._needs_copy(value):
            return copy.deepcopy(value)
        return value

    def _log(self, message):
        if self._logging_enabled:
            self._stats_log.append(message)

    def _is_expired(self, entry):
        if entry.expiration_time is None:
            return False
        return time.time() > entry.expiration_time

    def _calculate_entry_size(self, value):
        if isinstance(value, (dict, list)):
            import json
            return len(json.dumps(value))
        return len(str(value))

    def _cleanup_expired_from_heap(self, max_items=100):
        cleaned = 0
        current_time = time.time()
        while self._expiration_heap and cleaned < max_items:
            exp_time, counter, norm_key = self._expiration_heap[0]
            if exp_time > current_time:
                break
            heapq.heappop(self._expiration_heap)
            if norm_key in self._cache:
                entry = self._cache[norm_key]
                if entry.expiration_time is not None and entry.expiration_time <= current_time:
                    del self._cache[norm_key]
                    cleaned += 1
        return cleaned

    def get(self, key):
        norm_key = self._normalize_key(key)
        with self._lock:
            entry = self._cache.get(norm_key)
            if entry is None:
                self.misses += 1
                self._log("MISS: " + str(key))
                return None
            if self._is_expired(entry):
                del self._cache[norm_key]
                self.misses += 1
                self._log("EXPIRED: " + str(key))
                return None
            entry.last_accessed = time.time()
            entry.access_count += 1
            self._cache.move_to_end(norm_key)
            self.hits += 1
            self._log("HIT: " + str(key))
            return self._copy_if_needed(entry.value)

    def set(self, key, value, ttl_seconds=None):
        norm_key = self._normalize_key(key)
        if ttl_seconds is None:
            ttl_seconds = self.default_ttl
        with self._lock:
            if norm_key in self._cache:
                del self._cache[norm_key]
            while len(self._cache) >= self.max_size:
                self._evict_lru()
            entry = CacheEntry(norm_key, key, value, ttl_seconds)
            entry.size = self._calculate_entry_size(value)
            self._cache[norm_key] = entry
            if entry.expiration_time is not None:
                heapq.heappush(self._expiration_heap, (entry.expiration_time, self._heap_counter, norm_key))
                self._heap_counter += 1
            self._log("SET: " + str(key))

    def _evict_lru(self):
        if not self._cache:
            return
        evicted_key, evicted_entry = self._cache.popitem(last=False)
        self._log("EVICTED: " + str(evicted_entry.original_key))

    def delete(self, key):
        norm_key = self._normalize_key(key)
        with self._lock:
            if norm_key in self._cache:
                del self._cache[norm_key]
                self._log("DELETED: " + str(key))
                return True
            return False

    def clear(self):
        with self._lock:
            self._cache.clear()
            self._expiration_heap = []
            self._heap_counter = 0
            self._log("CLEARED")

    def cleanup_expired(self):
        with self._lock:
            expired_count = 0
            current_time = time.time()
            keys_to_delete = []
            for norm_key, entry in self._cache.items():
                if entry.expiration_time is not None and entry.expiration_time <= current_time:
                    keys_to_delete.append(norm_key)
            for norm_key in keys_to_delete:
                del self._cache[norm_key]
                expired_count += 1
            self._cleanup_expired_from_heap(len(self._expiration_heap))
            self._log("CLEANUP: removed " + str(expired_count) + " entries")
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
                import json
                key_str = json.dumps(key, sort_keys=True)
            elif isinstance(key, list):
                import json
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
                    if self._needs_copy(entry.original_key):
                        result.append(copy.deepcopy(entry.original_key))
                    else:
                        result.append(entry.original_key)
            return result

    def values(self):
        with self._lock:
            result = []
            current_time = time.time()
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    result.append(self._copy_if_needed(entry.value))
            return result

    def items(self):
        with self._lock:
            result = []
            current_time = time.time()
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    key_copy = copy.deepcopy(entry.original_key) if self._needs_copy(entry.original_key) else entry.original_key
                    result.append((key_copy, self._copy_if_needed(entry.value)))
            return result

    def size(self):
        with self._lock:
            count = 0
            current_time = time.time()
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
            total = self.hits + self.misses
            hit_rate = self.hits / total if total > 0 else 0
            return {
                "hits": self.hits,
                "misses": self.misses,
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
                        key_copy = copy.deepcopy(entry.original_key) if self._needs_copy(entry.original_key) else entry.original_key
                        results.append((key_copy, self._copy_if_needed(entry.value)))
            return results

    def find_by_pattern(self, pattern):
        with self._lock:
            results = []
            regex_pattern = pattern.replace('*', '.*').replace('?', '.')
            try:
                compiled = re.compile('^' + regex_pattern + '$')
            except re.error:
                return results
            current_time = time.time()
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    key_str = str(entry.original_key)
                    if compiled.match(key_str):
                        key_copy = copy.deepcopy(entry.original_key) if self._needs_copy(entry.original_key) else entry.original_key
                        results.append((key_copy, self._copy_if_needed(entry.value)))
            return results

    def get_lru_entries(self, count):
        with self._lock:
            valid_entries = []
            current_time = time.time()
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    valid_entries.append(entry)
            lru_entries = heapq.nsmallest(count, valid_entries, key=lambda e: e.last_accessed)
            results = []
            for entry in lru_entries:
                key_copy = copy.deepcopy(entry.original_key) if self._needs_copy(entry.original_key) else entry.original_key
                results.append({
                    "key": key_copy,
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count
                })
            return results

    def get_mru_entries(self, count):
        with self._lock:
            valid_entries = []
            current_time = time.time()
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    valid_entries.append(entry)
            mru_entries = heapq.nlargest(count, valid_entries, key=lambda e: e.last_accessed)
            results = []
            for entry in mru_entries:
                key_copy = copy.deepcopy(entry.original_key) if self._needs_copy(entry.original_key) else entry.original_key
                results.append({
                    "key": key_copy,
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count
                })
            return results

    def get_most_accessed(self, count):
        with self._lock:
            valid_entries = []
            current_time = time.time()
            for entry in self._cache.values():
                if entry.expiration_time is None or entry.expiration_time > current_time:
                    valid_entries.append(entry)
            most_accessed = heapq.nlargest(count, valid_entries, key=lambda e: e.access_count)
            results = []
            for entry in most_accessed:
                key_copy = copy.deepcopy(entry.original_key) if self._needs_copy(entry.original_key) else entry.original_key
                results.append({
                    "key": key_copy,
                    "access_count": entry.access_count
                })
            return results

    def export_stats_log(self):
        return '\n'.join(self._stats_log)
