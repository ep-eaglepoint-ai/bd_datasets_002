from typing import List, Optional


def fib(n: int) -> int:
    """Calculate the nth Fibonacci number (0-indexed). F(0)=0, F(1)=1."""
    if n < 0:
        raise ValueError("n must be non-negative")
    if n == 0:
        return 0
    if n == 1:
        return 1
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b


def fib_sequence(count: int) -> List[int]:
    """Generate first 'count' Fibonacci numbers."""
    if count == 0:
        return []
    if count == 1:
        return [0]
    result = [0, 1]
    for i in range(2, count):
        result.append(result[i - 1] + result[i - 2])
    return result


def fib_sum(count: int) -> int:
    """Sum of first 'count' Fibonacci numbers."""
    if count == 0:
        return 0
    if count == 1:
        return 0
    total = 1
    a, b = 0, 1
    for _ in range(2, count):
        a, b = b, a + b
        total += b
    return total


def find_fib_index(target: int) -> Optional[int]:
    """Find index of Fibonacci number equal to target, or None if not a Fib number."""
    if target < 0:
        return None
    if target == 0:
        return 0
    if target == 1:
        return 1
    a, b = 0, 1
    i = 1
    while b < target:
        a, b = b, a + b
        i += 1
    return i if b == target else None


def is_fibonacci(n: int) -> bool:
    """Check if n is a Fibonacci number."""
    return find_fib_index(n) is not None


def fib_up_to(limit: int) -> List[int]:
    """Return all Fibonacci numbers less than or equal to limit."""
    if limit < 0:
        return []
    result = [0]
    if limit == 0:
        return result
    a, b = 0, 1
    while b <= limit:
        result.append(b)
        a, b = b, a + b
    return result
