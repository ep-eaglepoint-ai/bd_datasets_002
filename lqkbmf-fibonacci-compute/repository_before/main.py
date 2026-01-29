from typing import List, Optional


def fib(n: int) -> int:
    """Calculate the nth Fibonacci number (0-indexed). F(0)=0, F(1)=1."""
    if n < 0:
        raise ValueError("n must be non-negative")
    if n == 0:
        return 0
    if n == 1:
        return 1
    return fib(n - 1) + fib(n - 2)


def fib_sequence(count: int) -> List[int]:
    """Generate first 'count' Fibonacci numbers."""
    result = []
    for i in range(count):
        result.append(fib(i))
    return result


def fib_sum(count: int) -> int:
    """Sum of first 'count' Fibonacci numbers."""
    total = 0
    for i in range(count):
        total = total + fib(i)
    return total


def find_fib_index(target: int) -> Optional[int]:
    """Find index of Fibonacci number equal to target, or None if not a Fib number."""
    if target < 0:
        return None
    i = 0
    while True:
        f = fib(i)
        if f == target:
            return i
        if f > target:
            return None
        i = i + 1


def is_fibonacci(n: int) -> bool:
    """Check if n is a Fibonacci number."""
    return find_fib_index(n) is not None


def fib_up_to(limit: int) -> List[int]:
    """Return all Fibonacci numbers less than or equal to limit."""
    result = []
    i = 0
    while True:
        f = fib(i)
        if f > limit:
            break
        result.append(f)
        i = i + 1
    return result
