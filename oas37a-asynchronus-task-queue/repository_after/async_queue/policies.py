"""
Retry logic policies for the async task queue.
"""

import random


class RetryPolicy:
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 60.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
    
    def get_delay(self, retry_count: int) -> float:
        delay = self.base_delay * (2 ** retry_count)  # FIX R6: Removed -1 for proper exponential
        jitter = random.uniform(0, 0.5) * delay  # FIX R6: Changed to non-negative jitter
        delay = delay + jitter
        # FIX R6: Changed from max to min
        return min(delay, self.max_delay)
    
    def should_retry(self, retry_count: int) -> bool:
        # FIX R6: Changed from >= to <
        return retry_count < self.max_retries
