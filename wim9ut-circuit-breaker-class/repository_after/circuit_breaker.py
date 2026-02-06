import time
import threading
from enum import Enum
from functools import wraps
from typing import Callable, Iterable, Optional, Tuple, Any

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitOpenError(Exception):
    pass

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, failure_window: float = 5.0,
                 recovery_timeout: float = 2.0, exceptions: Tuple[type, ...] = (Exception,)):
        self.failure_threshold = failure_threshold
        self.failure_window = failure_window
        self.recovery_timeout = recovery_timeout
        self.exceptions = exceptions
        self._lock = threading.RLock()
        self._state = CircuitState.CLOSED
        self._failures: list[float] = []
        self._opened_at: Optional[float] = None
        self._half_open_inflight = False

    @property
    def state(self) -> CircuitState:
        with self._lock:
            self._update_state_if_timeout()
            return self._state

    @property
    def failure_count(self) -> int:
        with self._lock:
            self._prune_failures()
            return len(self._failures)

    def _prune_failures(self) -> None:
        cutoff = time.time() - self.failure_window
        self._failures = [t for t in self._failures if t >= cutoff]

    def _update_state_if_timeout(self) -> None:
        if self._state == CircuitState.OPEN and self._opened_at is not None:
            if time.time() - self._opened_at >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                self._half_open_inflight = False

    def reset(self) -> None:
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failures.clear()
            self._opened_at = None
            self._half_open_inflight = False

    def trip(self) -> None:
        with self._lock:
            self._state = CircuitState.OPEN
            self._opened_at = time.time()
            self._half_open_inflight = False

    def _record_failure(self) -> None:
        self._failures.append(time.time())
        self._prune_failures()
        if len(self._failures) >= self.failure_threshold:
            self._state = CircuitState.OPEN
            self._opened_at = time.time()
            self._half_open_inflight = False

    def call(self, func: Callable, *args, **kwargs) -> Any:
        with self._lock:
            self._update_state_if_timeout()
            if self._state == CircuitState.OPEN:
                raise CircuitOpenError("Circuit is open")
            if self._state == CircuitState.HALF_OPEN:
                if self._half_open_inflight:
                    raise CircuitOpenError("Circuit half-open: trial in progress")
                self._half_open_inflight = True
        # execute outside lock
        try:
            result = func(*args, **kwargs)
        except self.exceptions as exc:
            with self._lock:
                if self._state == CircuitState.HALF_OPEN:
                    self._state = CircuitState.OPEN
                    self._opened_at = time.time()
                    self._half_open_inflight = False
                else:
                    self._record_failure()
            raise exc
        else:
            with self._lock:
                if self._state == CircuitState.HALF_OPEN:
                    self._state = CircuitState.CLOSED
                    self._failures.clear()
                    self._opened_at = None
                    self._half_open_inflight = False
            return result

    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper
