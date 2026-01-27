
# // filename: src/cache/lru_ttl_cache.py

import time
from collections import OrderedDict

class LRUCacheWithTTL:
    """
    LRU Cache with Time-To-Live expiration.
    Capacity limits the number of items. TTL (seconds) limits the age of items.
    """
    def __init__(self, capacity: int, ttl: int):
        self.cache = OrderedDict()
        self.capacity = capacity
        self.ttl = ttl
        self.expiry_map = {} # key -> expiration_timestamp

    def get(self, key):
        if key not in self.cache:
            return None
        
        if time.time() > self.expiry_map[key]:
            self._delete(key)
            return None

        # Move to end to represent recently used
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self._delete(key)
        
        if len(self.cache) >= self.capacity:
            # Pop the oldest item (LRU)
            oldest_key, _ = self.cache.popitem(last=False)
            del self.expiry_map[oldest_key]

        self.cache[key] = value
        self.expiry_map[key] = time.time() + self.ttl

    def _delete(self, key):
        if key in self.cache:
            del self.cache[key]
            del self.expiry_map[key]

    def prune_expired(self):
        """Manually trigger cleanup of all expired items."""
        now = time.time()
        keys_to_del = [k for k, exp in self.expiry_map.items() if now > exp]
        for k in keys_to_del:
            self._delete(k)
        return len(keys_to_del)