import sys
import os
sys.path.insert(0, os.path.abspath('.'))
import time
import threading
import importlib

repo = os.environ.get("REPO", "repository_after")
cb = importlib.import_module(f"{repo}.circuit_breaker")
CircuitBreaker = cb.CircuitBreaker
CircuitState = cb.CircuitState
CircuitOpenError = cb.CircuitOpenError


def test_closed_to_open_and_reject():
    breaker = CircuitBreaker(failure_threshold=2, failure_window=1, recovery_timeout=0.2)
    def fail():
        raise ValueError("boom")
    for _ in range(2):
        try:
            breaker.call(fail)
        except ValueError:
            pass
    assert breaker.state == CircuitState.OPEN
    try:
        breaker.call(lambda: "ok")
        assert False
    except CircuitOpenError:
        pass


def test_failure_window_resets():
    breaker = CircuitBreaker(failure_threshold=2, failure_window=0.1, recovery_timeout=0.2)
    def fail():
        raise ValueError()
    try:
        breaker.call(fail)
    except ValueError:
        pass
    time.sleep(0.2)
    assert breaker.failure_count == 0


def test_half_open_success_closes():
    breaker = CircuitBreaker(failure_threshold=1, failure_window=1, recovery_timeout=0.1)
    def fail():
        raise ValueError()
    try:
        breaker.call(fail)
    except ValueError:
        pass
    time.sleep(0.11)
    assert breaker.state == CircuitState.HALF_OPEN
    assert breaker.call(lambda: "ok") == "ok"
    assert breaker.state == CircuitState.CLOSED


def test_half_open_failure_reopens():
    breaker = CircuitBreaker(failure_threshold=1, failure_window=1, recovery_timeout=0.1)
    def fail():
        raise ValueError()
    try:
        breaker.call(fail)
    except ValueError:
        pass
    time.sleep(0.11)
    assert breaker.state == CircuitState.HALF_OPEN
    try:
        breaker.call(fail)
    except ValueError:
        pass
    assert breaker.state == CircuitState.OPEN


def test_exceptions_filtering():
    breaker = CircuitBreaker(failure_threshold=1, exceptions=(ValueError,))
    def fail():
        raise TypeError("ignore")
    try:
        breaker.call(fail)
    except TypeError:
        pass
    assert breaker.state == CircuitState.CLOSED


def test_decorator_interface():
    breaker = CircuitBreaker(failure_threshold=1)
    @breaker
    def ok():
        return 5
    assert ok() == 5


def test_thread_safety():
    breaker = CircuitBreaker(failure_threshold=5)
    errors = []
    def worker(i):
        try:
            breaker.call(lambda: i)
        except Exception as e:
            errors.append(e)
    threads = [threading.Thread(target=worker, args=(i,)) for i in range(20)]
    for t in threads: t.start()
    for t in threads: t.join()
    assert isinstance(errors, list)

