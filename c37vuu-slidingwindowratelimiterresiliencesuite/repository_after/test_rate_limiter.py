import pytest
from hypothesis import given, strategies as st
from rate_limiter import SlidingWindowLimiter


def max_in_window(timestamps, window):
    """Helper function to find the maximum number of timestamps in any window of given duration."""
    if not timestamps:
        return 0
    timestamps = sorted(timestamps)
    max_count = 0
    left = 0
    for right in range(len(timestamps)):
        while timestamps[right] - timestamps[left] > window:
            left += 1
        max_count = max(max_count, right - left + 1)
    return max_count


@given(st.lists(st.floats(min_value=0, max_value=1000), min_size=1, max_size=1000))
def test_sliding_window_property(timestamps):
    """Property-based test to ensure the limiter never allows more than max_requests at any time."""
    limiter = SlidingWindowLimiter(5, 60.0)
    for ts in sorted(timestamps):  # Sort to simulate time passing
        limiter.is_allowed('user', ts)
        assert len(limiter._storage['user']) <= 5


@given(st.lists(st.floats(min_value=0, max_value=1000), min_size=10, max_size=100))
def test_memory_leak_prevention(timestamps):
    """Test that storage does not grow indefinitely under constant traffic."""
    limiter = SlidingWindowLimiter(5, 60.0)
    for ts in sorted(timestamps):  # Simulate time passing
        limiter.is_allowed('user', ts)
    # Force cleanup at the end
    limiter.force_cleanup('user', timestamps[-1])
    assert len(limiter._storage.get('user', [])) <= 5


def test_boundary_conditions():
    """Test exact boundaries of the window."""
    limiter = SlidingWindowLimiter(1, 60.0)
    assert limiter.is_allowed('user', 0.0)
    assert not limiter.is_allowed('user', 59.999999)  # Still in window
    assert limiter.is_allowed('user', 60.000001)  # Just out of window


def test_rejected_requests_do_not_increment():
    """Ensure rejected requests do not increment the counter."""
    limiter = SlidingWindowLimiter(1, 60.0)
    assert limiter.is_allowed('user', 0.0)
    assert not limiter.is_allowed('user', 0.0)
    assert limiter.get_current_count('user') == 1


def test_out_of_order_timestamps():
    """Test handling of out-of-order timestamps."""
    limiter = SlidingWindowLimiter(2, 60.0)
    # Allow at t=10 and t=20
    assert limiter.is_allowed('user', 10.0)
    assert limiter.is_allowed('user', 20.0)
    # Now insert earlier timestamp at t=5, should not be allowed since window already has 2
    assert not limiter.is_allowed('user', 5.0)
    # But at t=30, should not allow more
    assert not limiter.is_allowed('user', 30.0)


def test_cleanup_removes_old_entries():
    """Test that cleanup removes timestamps outside the window."""
    limiter = SlidingWindowLimiter(5, 60.0)
    # Add some timestamps
    for i in range(5):
        limiter.is_allowed('user', float(i))
    # At t=70, cleanup should remove all
    limiter.is_allowed('user', 70.0)
    assert len(limiter._storage['user']) == 1  # Only the new one


def test_multiple_users():
    """Test that different users have separate limits."""
    limiter = SlidingWindowLimiter(1, 60.0)
    assert limiter.is_allowed('user1', 0.0)
    assert limiter.is_allowed('user2', 0.0)
    assert not limiter.is_allowed('user1', 0.0)
    assert not limiter.is_allowed('user2', 0.0)


def test_force_cleanup():
    """Test manual cleanup."""
    limiter = SlidingWindowLimiter(5, 60.0)
    for i in range(5):
        limiter.is_allowed('user', float(i))
    limiter.force_cleanup('user', 70.0)
    assert len(limiter._storage['user']) == 0