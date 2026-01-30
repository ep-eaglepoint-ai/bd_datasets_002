import pytest
import sys
import os
from pathlib import Path
import signal

repo_path = os.environ.get("REPO_PATH", "repository_after")
sys.path.insert(0, str(Path(__file__).parent.parent / repo_path))
from main import fib, fib_sequence, fib_sum, find_fib_index, is_fibonacci, fib_up_to


class TimeoutError(Exception):
    pass


def timeout_handler(signum, frame):
    raise TimeoutError("Test exceeded 1 second timeout")


def with_timeout(seconds=1):
    def decorator(func):
        def wrapper(*args, **kwargs):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(seconds)
            try:
                result = func(*args, **kwargs)
            finally:
                signal.alarm(0)
            return result
        return wrapper
    return decorator


class TestFib:
    def test_base_cases(self):
        assert fib(0) == 0
        assert fib(1) == 1
        assert fib(2) == 1
        assert fib(3) == 2
        assert fib(4) == 3
        assert fib(5) == 5
        assert fib(6) == 8
        assert fib(10) == 55

    def test_large_values(self):
        @with_timeout(1)
        def run_test():
            assert fib(20) == 6765
            assert fib(30) == 832040
            assert fib(50) == 12586269025
        run_test()

    def test_performance(self):
        @with_timeout(1)
        def run_test():
            result = fib(1000)
            assert result > 0
        run_test()

    def test_negative_input(self):
        with pytest.raises(ValueError):
            fib(-1)


class TestFibSequence:
    def test_empty(self):
        assert fib_sequence(0) == []

    def test_small_sequences(self):
        assert fib_sequence(1) == [0]
        assert fib_sequence(2) == [0, 1]
        assert fib_sequence(5) == [0, 1, 1, 2, 3]
        assert fib_sequence(10) == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

    def test_performance(self):
        @with_timeout(1)
        def run_test():
            result = fib_sequence(1000)
            assert len(result) == 1000
            assert result[0] == 0
            assert result[1] == 1
        run_test()


class TestFibSum:
    def test_base_cases(self):
        assert fib_sum(0) == 0
        assert fib_sum(1) == 0
        assert fib_sum(2) == 1
        assert fib_sum(3) == 2
        assert fib_sum(5) == 7
        assert fib_sum(10) == 88

    def test_performance(self):
        @with_timeout(1)
        def run_test():
            result = fib_sum(1000)
            assert result > 0
        run_test()


class TestFindFibIndex:
    def test_valid_fibonacci_numbers(self):
        assert find_fib_index(0) == 0
        assert find_fib_index(1) == 1
        assert find_fib_index(2) == 3
        assert find_fib_index(3) == 4
        assert find_fib_index(5) == 5
        assert find_fib_index(8) == 6
        assert find_fib_index(55) == 10

    def test_invalid_numbers(self):
        assert find_fib_index(4) is None
        assert find_fib_index(6) is None
        assert find_fib_index(7) is None
        assert find_fib_index(100) is None

    def test_negative_input(self):
        assert find_fib_index(-1) is None


class TestIsFibonacci:
    def test_valid_fibonacci_numbers(self):
        assert is_fibonacci(0) is True
        assert is_fibonacci(1) is True
        assert is_fibonacci(2) is True
        assert is_fibonacci(3) is True
        assert is_fibonacci(5) is True
        assert is_fibonacci(8) is True
        assert is_fibonacci(13) is True

    def test_invalid_numbers(self):
        assert is_fibonacci(4) is False
        assert is_fibonacci(6) is False
        assert is_fibonacci(7) is False
        assert is_fibonacci(100) is False


class TestFibUpTo:
    def test_base_cases(self):
        assert fib_up_to(0) == [0]
        assert fib_up_to(1) == [0, 1, 1]
        assert fib_up_to(5) == [0, 1, 1, 2, 3, 5]
        assert fib_up_to(10) == [0, 1, 1, 2, 3, 5, 8]
        assert fib_up_to(100) == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

    def test_negative_limit(self):
        assert fib_up_to(-1) == []
