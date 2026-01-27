import time
import threading
import hashlib
import json
import copy


class CacheEntry:
    def __init__(self, key, value, ttl_seconds=None):
        self.key = key
        self.value = value
        self.created_at = time.time()
        self.last_accessed = time.time()
        self.access_count = 0
        self.ttl_seconds = ttl_seconds
        self.size = 0


class UnoptimizedCache:
    def __init__(self, max_size=1000, default_ttl=300):
        self.entries = []
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.stats_log = ""
        self.lock = threading.Lock()
        self.hits = 0
        self.misses = 0
    
    def _compute_key_hash(self, key):
        key_str = ""
        if isinstance(key, dict):
            for k in sorted(key.keys()):
                key_str = key_str + str(k) + ":" + str(key[k]) + ","
        elif isinstance(key, list):
            for item in key:
                key_str = key_str + str(item) + ","
        else:
            key_str = str(key)
        
        hash_val = 0
        for char in key_str:
            hash_val = hash_val + ord(char)
        return hash_val
    
    def _find_entry(self, key):
        key_hash = self._compute_key_hash(key)
        for entry in self.entries:
            entry_hash = self._compute_key_hash(entry.key)
            if entry_hash == key_hash:
                if self._keys_equal(entry.key, key):
                    return entry
        return None
    
    def _keys_equal(self, key1, key2):
        if type(key1) != type(key2):
            return False
        
        if isinstance(key1, dict):
            if len(key1) != len(key2):
                return False
            for k in key1:
                if k not in key2:
                    return False
                if not self._keys_equal(key1[k], key2[k]):
                    return False
            return True
        elif isinstance(key1, list):
            if len(key1) != len(key2):
                return False
            for i in range(len(key1)):
                if not self._keys_equal(key1[i], key2[i]):
                    return False
            return True
        else:
            return key1 == key2
    
    def _is_expired(self, entry):
        if entry.ttl_seconds is None:
            return False
        current_time = time.time()
        age = current_time - entry.created_at
        if age > entry.ttl_seconds:
            return True
        return False
    
    def _calculate_entry_size(self, value):
        size = 0
        value_str = ""
        if isinstance(value, dict):
            value_str = json.dumps(value)
        elif isinstance(value, list):
            value_str = json.dumps(value)
        else:
            value_str = str(value)
        
        for char in value_str:
            size = size + 1
        return size
    
    def get(self, key):
        with self.lock:
            entry = self._find_entry(key)
            
            if entry is None:
                self.misses = self.misses + 1
                self.stats_log = self.stats_log + "MISS: " + str(key) + "\n"
                return None
            
            if self._is_expired(entry):
                self._remove_entry(key)
                self.misses = self.misses + 1
                self.stats_log = self.stats_log + "EXPIRED: " + str(key) + "\n"
                return None
            
            entry.last_accessed = time.time()
            entry.access_count = entry.access_count + 1
            self.hits = self.hits + 1
            self.stats_log = self.stats_log + "HIT: " + str(key) + "\n"
            
            return copy.deepcopy(entry.value)
    
    def set(self, key, value, ttl_seconds=None):
        with self.lock:
            if ttl_seconds is None:
                ttl_seconds = self.default_ttl
            
            existing = self._find_entry(key)
            if existing is not None:
                self._remove_entry(key)
            
            if len(self.entries) >= self.max_size:
                self._evict_lru()
            
            entry = CacheEntry(copy.deepcopy(key), copy.deepcopy(value), ttl_seconds)
            entry.size = self._calculate_entry_size(value)
            self.entries.append(entry)
            
            self.stats_log = self.stats_log + "SET: " + str(key) + "\n"
    
    def _remove_entry(self, key):
        new_entries = []
        for entry in self.entries:
            if not self._keys_equal(entry.key, key):
                new_entries.append(entry)
        self.entries = new_entries
    
    def _evict_lru(self):
        if len(self.entries) == 0:
            return
        
        lru_entry = self.entries[0]
        for entry in self.entries:
            if entry.last_accessed < lru_entry.last_accessed:
                lru_entry = entry
        
        self._remove_entry(lru_entry.key)
        self.stats_log = self.stats_log + "EVICTED: " + str(lru_entry.key) + "\n"
    
    def delete(self, key):
        with self.lock:
            before_count = len(self.entries)
            self._remove_entry(key)
            after_count = len(self.entries)
            
            if before_count > after_count:
                self.stats_log = self.stats_log + "DELETED: " + str(key) + "\n"
                return True
            return False
    
    def clear(self):
        with self.lock:
            self.entries = []
            self.stats_log = self.stats_log + "CLEARED\n"
    
    def cleanup_expired(self):
        with self.lock:
            expired_count = 0
            new_entries = []
            
            for entry in self.entries:
                if not self._is_expired(entry):
                    new_entries.append(entry)
                else:
                    expired_count = expired_count + 1
            
            self.entries = new_entries
            self.stats_log = self.stats_log + "CLEANUP: removed " + str(expired_count) + " entries\n"
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
            key_str = ""
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
        with self.lock:
            result = []
            for entry in self.entries:
                if not self._is_expired(entry):
                    result.append(copy.deepcopy(entry.key))
            return result
    
    def values(self):
        with self.lock:
            result = []
            for entry in self.entries:
                if not self._is_expired(entry):
                    result.append(copy.deepcopy(entry.value))
            return result
    
    def items(self):
        with self.lock:
            result = []
            for entry in self.entries:
                if not self._is_expired(entry):
                    result.append((copy.deepcopy(entry.key), copy.deepcopy(entry.value)))
            return result
    
    def size(self):
        with self.lock:
            count = 0
            for entry in self.entries:
                if not self._is_expired(entry):
                    count = count + 1
            return count
    
    def total_memory_size(self):
        with self.lock:
            total = 0
            for entry in self.entries:
                total = total + entry.size
            return total
    
    def get_stats(self):
        with self.lock:
            total = self.hits + self.misses
            if total > 0:
                hit_rate = self.hits / total
            else:
                hit_rate = 0
            
            return {
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": hit_rate,
                "size": self.size(),
                "total_memory": self.total_memory_size()
            }
    
    def find_by_prefix(self, prefix):
        with self.lock:
            results = []
            prefix_str = str(prefix)
            
            for entry in self.entries:
                if not self._is_expired(entry):
                    key_str = str(entry.key)
                    
                    matches = True
                    if len(key_str) < len(prefix_str):
                        matches = False
                    else:
                        for i in range(len(prefix_str)):
                            if key_str[i] != prefix_str[i]:
                                matches = False
                                break
                    
                    if matches:
                        results.append((copy.deepcopy(entry.key), copy.deepcopy(entry.value)))
            
            return results
    
    def find_by_pattern(self, pattern):
        with self.lock:
            results = []
            
            for entry in self.entries:
                if not self._is_expired(entry):
                    key_str = str(entry.key)
                    
                    if self._matches_pattern(key_str, pattern):
                        results.append((copy.deepcopy(entry.key), copy.deepcopy(entry.value)))
            
            return results
    
    def _matches_pattern(self, text, pattern):
        pattern_idx = 0
        text_idx = 0
        
        while pattern_idx < len(pattern) and text_idx < len(text):
            if pattern[pattern_idx] == '*':
                if pattern_idx == len(pattern) - 1:
                    return True
                
                next_char = pattern[pattern_idx + 1]
                while text_idx < len(text) and text[text_idx] != next_char:
                    text_idx = text_idx + 1
                pattern_idx = pattern_idx + 1
            elif pattern[pattern_idx] == '?':
                pattern_idx = pattern_idx + 1
                text_idx = text_idx + 1
            elif pattern[pattern_idx] == text[text_idx]:
                pattern_idx = pattern_idx + 1
                text_idx = text_idx + 1
            else:
                return False
        
        while pattern_idx < len(pattern) and pattern[pattern_idx] == '*':
            pattern_idx = pattern_idx + 1
        
        return pattern_idx == len(pattern) and text_idx == len(text)
    
    def get_lru_entries(self, count):
        with self.lock:
            valid_entries = []
            for entry in self.entries:
                if not self._is_expired(entry):
                    valid_entries.append(entry)
            
            n = len(valid_entries)
            for i in range(n):
                for j in range(0, n - i - 1):
                    if valid_entries[j].last_accessed > valid_entries[j + 1].last_accessed:
                        temp = valid_entries[j]
                        valid_entries[j] = valid_entries[j + 1]
                        valid_entries[j + 1] = temp
            
            results = []
            for i in range(min(count, len(valid_entries))):
                entry = valid_entries[i]
                results.append({
                    "key": copy.deepcopy(entry.key),
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count
                })
            
            return results
    
    def get_mru_entries(self, count):
        with self.lock:
            valid_entries = []
            for entry in self.entries:
                if not self._is_expired(entry):
                    valid_entries.append(entry)
            
            n = len(valid_entries)
            for i in range(n):
                for j in range(0, n - i - 1):
                    if valid_entries[j].last_accessed < valid_entries[j + 1].last_accessed:
                        temp = valid_entries[j]
                        valid_entries[j] = valid_entries[j + 1]
                        valid_entries[j + 1] = temp
            
            results = []
            for i in range(min(count, len(valid_entries))):
                entry = valid_entries[i]
                results.append({
                    "key": copy.deepcopy(entry.key),
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count
                })
            
            return results
    
    def get_most_accessed(self, count):
        with self.lock:
            valid_entries = []
            for entry in self.entries:
                if not self._is_expired(entry):
                    valid_entries.append(entry)
            
            n = len(valid_entries)
            for i in range(n):
                for j in range(0, n - i - 1):
                    if valid_entries[j].access_count < valid_entries[j + 1].access_count:
                        temp = valid_entries[j]
                        valid_entries[j] = valid_entries[j + 1]
                        valid_entries[j + 1] = temp
            
            results = []
            for i in range(min(count, len(valid_entries))):
                entry = valid_entries[i]
                results.append({
                    "key": copy.deepcopy(entry.key),
                    "access_count": entry.access_count
                })
            
            return results
    
    def export_stats_log(self):
        return self.stats_log