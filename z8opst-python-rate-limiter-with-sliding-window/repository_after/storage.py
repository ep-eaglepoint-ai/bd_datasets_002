import threading
import time
from abc import ABC, abstractmethod
from typing import Any, Dict

class Storage(ABC):
    @abstractmethod
    def get_lock(self, key: str) -> threading.Lock: pass
    @abstractmethod
    def get(self, key: str) -> Any: pass
    @abstractmethod
    def set(self, key: str, value: Any, ttl: float): pass
    @abstractmethod
    def delete(self, key: str): pass

class InMemoryStorage(Storage):
    def __init__(self, cleanup_interval: float = 10.0):
        self._data: Dict[str, Any] = {}
        self._locks: Dict[str, threading.Lock] = {}
        self._expiry: Dict[str, float] = {}
        self._global_lock = threading.Lock()
        
        # Requirement 2: Automatic Background Cleanup
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_interval = cleanup_interval
        self._cleanup_thread.start()

    def get_lock(self, key: str) -> threading.Lock:
        # Requirement 6: Per-key locking
        with self._global_lock:
            if key not in self._locks:
                self._locks[key] = threading.Lock()
            return self._locks[key]

    def get(self, key: str) -> Any:
        return self._data.get(key)

    def set(self, key: str, value: Any, ttl: float = 300.0):
        self._data[key] = value
        self._expiry[key] = time.time() + ttl

    def delete(self, key: str):
        self._data.pop(key, None)
        self._expiry.pop(key, None)

    def _cleanup_loop(self):
        while True:
            time.sleep(self._cleanup_interval)
            now = time.time()
            with self._global_lock:
                expired = [k for k, exp in self._expiry.items() if now > exp]
                for k in expired:
                    self._data.pop(k, None)
                    self._expiry.pop(k, None)
                    self._locks.pop(k, None)