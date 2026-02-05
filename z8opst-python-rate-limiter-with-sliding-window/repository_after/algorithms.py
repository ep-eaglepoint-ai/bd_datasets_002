import math
from abc import ABC, abstractmethod
from typing import Any, Tuple, Dict, List, Optional
from types_limiter import RateLimiterConfig

class BaseAlgorithm(ABC):
    def __init__(self, config: RateLimiterConfig):
        self.config = config

    @abstractmethod
    def is_allowed(self, state: Any, now: float) -> Tuple[bool, Any]:
        pass

    @abstractmethod
    def get_remaining(self, state: Any, now: float) -> int:
        pass

    @abstractmethod
    def get_reset_time(self, state: Any, now: float) -> float:
        pass

class FixedWindow(BaseAlgorithm):
    def _get_window(self, now: float):
        window_id = math.floor(now / self.config.window_size_seconds)
        window_end = (window_id + 1) * self.config.window_size_seconds
        return window_id, window_end

    def is_allowed(self, state: Any, now: float) -> Tuple[bool, Any]:
        win_id, win_end = self._get_window(now)
        # state format: (window_id, count)
        if not state or state[0] != win_id:
            state = (win_id, 0)
        
        if state[1] < self.config.requests_per_window:
            return True, (win_id, state[1] + 1)
        return False, state

    def get_remaining(self, state: Any, now: float) -> int:
        win_id, _ = self._get_window(now)
        if not state or state[0] != win_id:
            return self.config.requests_per_window
        return max(0, self.config.requests_per_window - state[1])

    def get_reset_time(self, state: Any, now: float) -> float:
        _, win_end = self._get_window(now)
        return win_end

class SlidingWindowLog(BaseAlgorithm):
    def _filter(self, logs: List[float], now: float) -> List[float]:
        cutoff = now - self.config.window_size_seconds
        return [ts for ts in logs if ts > cutoff]

    def is_allowed(self, state: Any, now: float) -> Tuple[bool, Any]:
        logs = self._filter(state or [], now)
        if len(logs) < self.config.requests_per_window:
            logs.append(now)
            return True, logs
        return False, logs

    def get_remaining(self, state: Any, now: float) -> int:
        logs = self._filter(state or [], now)
        return max(0, self.config.requests_per_window - len(logs))

    def get_reset_time(self, state: Any, now: float) -> float:
        logs = self._filter(state or [], now)
        if not logs:
            return now
        return logs[0] + self.config.window_size_seconds

class SlidingWindowCounter(BaseAlgorithm):
    def is_allowed(self, state: Any, now: float) -> Tuple[bool, Any]:
        curr_win_id = math.floor(now / self.config.window_size_seconds)
        state = state or {}
        
        curr_count = state.get(curr_win_id, 0)
        prev_count = state.get(curr_win_id - 1, 0)
        
        win_start = curr_win_id * self.config.window_size_seconds
        overlap_weight = 1 - ((now - win_start) / self.config.window_size_seconds)
        
        estimated = (prev_count * overlap_weight) + curr_count
        
        if estimated < self.config.requests_per_window:
            new_state = {curr_win_id: curr_count + 1, curr_win_id - 1: prev_count}
            return True, new_state
        return False, state

    def get_remaining(self, state: Any, now: float) -> int:
        curr_win_id = math.floor(now / self.config.window_size_seconds)
        if not state: return self.config.requests_per_window
        curr_count = state.get(curr_win_id, 0)
        prev_count = state.get(curr_win_id - 1, 0)
        win_start = curr_win_id * self.config.window_size_seconds
        weight = 1 - ((now - win_start) / self.config.window_size_seconds)
        return max(0, self.config.requests_per_window - math.floor(curr_count + (prev_count * weight)))

    def get_reset_time(self, state: Any, now: float) -> float:
        curr_win_id = math.floor(now / self.config.window_size_seconds)
        return (curr_win_id + 1) * self.config.window_size_seconds

class TokenBucket(BaseAlgorithm):
    def is_allowed(self, state: Any, now: float) -> Tuple[bool, Any]:
        if not state:
            # (last_refill_time, current_tokens)
            state = (now, float(self.config.bucket_capacity))
        
        last_time, tokens = state
        elapsed = now - last_time
        refill = elapsed * self.config.refill_rate
        new_tokens = min(float(self.config.bucket_capacity), tokens + refill)
        
        if new_tokens >= 1.0:
            return True, (now, new_tokens - 1.0)
        return False, (now, new_tokens)

    def get_remaining(self, state: Any, now: float) -> int:
        if not state: return self.config.bucket_capacity
        last_time, tokens = state
        new_tokens = min(float(self.config.bucket_capacity), tokens + (now - last_time) * self.config.refill_rate)
        return math.floor(new_tokens)

    def get_reset_time(self, state: Any, now: float) -> float:
        if self.get_remaining(state, now) >= 1: return now
        last_time, tokens = state
        return now + (1.0 - tokens) / self.config.refill_rate