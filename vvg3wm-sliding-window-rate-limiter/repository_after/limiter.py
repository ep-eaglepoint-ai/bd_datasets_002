from __future__ import annotations
import time
import threading
from collections import deque
from typing import Callable, Dict

class RateLimiter:
    """
    A thread-safe Sliding Window Rate Limiter.
    
    This implementation ensures that requests are tracked continuously within a 
    moving time range, avoiding the boundary burst issues of fixed-window algorithms.
    """
    
    def __init__(
        self, 
        max_requests: int, 
        window_seconds: float, 
        time_function: Callable[[], float] | None = None
    ) -> None:
        """
        Initialize the limiter.
        
        Args:
            max_requests: Maximum number of allowed requests in the window.
            window_seconds: The duration of the sliding window in seconds.
            time_function: Optional injectable time source (defaults to time.time).
        """
        if max_requests <= 0:
            raise ValueError("max_requests must be a positive integer.")
        if window_seconds <= 0:
            raise ValueError("window_seconds must be a positive float.")
            
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.time_func = time_function or time.time
        
        # Internal state: key -> deque of timestamps
        self._history: Dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _get_clean_history(self, key: str, now: float) -> deque[float]:
        """Filters out expired timestamps for a specific key."""
        if key not in self._history:
            self._history[key] = deque()
            
        history = self._history[key]
        cutoff = now - self.window_seconds
        
        # Remove timestamps outside the sliding window
        while history and history[0] <= cutoff:
            history.popleft()
            
        return history

    def is_allowed(self, key: str) -> bool:
        """
        Checks if a request is allowed for the given key and records it if so.
        
        Atomic check-and-increment using a lock.
        """
        now = self.time_func()
        with self._lock:
            history = self._get_clean_history(key, now)
            
            if len(history) < self.max_requests:
                history.append(now)
                return True
            return False

    def get_remaining(self, key: str) -> int:
        """Returns the number of requests remaining for the key in the current window."""
        now = self.time_func()
        with self._lock:
            history = self._get_clean_history(key, now)
            return max(0, self.max_requests - len(history))

    def reset(self, key: str) -> None:
        """Completely clears the history for a specific key."""
        with self._lock:
            if key in self._history:
                del self._history[key]

    def cleanup(self) -> None:
        """
        Removes expired entries across all keys to prevent unbounded memory growth.
        
        Prunes both expired timestamps and empty key entries.
        """
        now = self.time_func()
        with self._lock:
            keys_to_remove = []
            for key in self._history:
                self._get_clean_history(key, now)
                if not self._history[key]:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self._history[key]