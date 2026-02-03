# filename: rate_limiter.py

import math
from typing import List, Dict, Optional

# 'time' is used here to define the type hint for timestamps.
# In production, this would interface with a high-precision system clock.
import time 

# /**
#  * Data Shape Documentation:
#  * - _storage: Dictionary mapping user_id (str) to a list of floats.
#  * - The list of floats contains Unix timestamps in seconds.
#  * - Timestamps are expected to be high-precision (microsecond resolution).
#  */

class SlidingWindowLimiter:
    def __init__(self, max_requests: int, window_seconds: float):
        """
        Initializes the limiter.
        :param max_requests: Maximum allowed requests within the window.
        :param window_seconds: The duration of the sliding window in seconds.
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._storage: Dict[str, List[float]] = {}

    def is_allowed(self, user_id: str, current_timestamp: float) -> bool:
        """
        Determines if a request is allowed based on the sliding window logic.
        This method is intended to be idempotent in its check but stateful in its success.
        """
        if user_id not in self._storage:
            self._storage[user_id] = []

        # 1. Cleanup: Remove timestamps that have fallen out of the window
        expiry_limit = current_timestamp - self.window_seconds
        self._storage[user_id] = [
            ts for ts in self._storage[user_id] if ts > expiry_limit
        ]

        # 2. Rate Limit Check
        if len(self._storage[user_id]) < self.max_requests:
            # Record the successful request timestamp
            self._storage[user_id].append(current_timestamp)
            return True
        
        return False

    def get_current_count(self, user_id: str) -> int:
        """
        Returns the number of valid timestamps currently in the user's window.
        """
        return len(self._storage.get(user_id, []))

    def force_cleanup(self, user_id: str, current_timestamp: float):
        """
        Manually purges old records for a specific user to free memory.
        """
        if user_id in self._storage:
            expiry_limit = current_timestamp - self.window_seconds
            self._storage[user_id] = [
                ts for ts in self._storage[user_id] if ts > expiry_limit
            ]
