"""
Custom pytest configuration to handle timeouts gracefully.
This intercepts pytest-timeout's behavior to prevent INTERNALERROR crashes.
"""
import signal
import pytest

class SafeTimeoutError(Exception):
    """Raised when a test times out."""
    pass

def _timeout_handler(signum, frame):
    raise SafeTimeoutError("Test exceeded timeout limit")

@pytest.fixture(autouse=True)
def safe_timeout(request):
    """
    Fixture that applies a safe timeout to each test.
    Reads timeout from pytest.mark.timeout marker if present.
    """
    marker = request.node.get_closest_marker('timeout')
    if marker is None:
        yield
        return
    
    timeout_seconds = marker.args[0] if marker.args else 10
    
    # Set up signal handler
    original_handler = signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(timeout_seconds)
    
    try:
        yield
    except SafeTimeoutError as e:
        pytest.fail(f"Test timed out after {timeout_seconds} seconds")
    finally:
        # Always clean up the alarm
        signal.alarm(0)
        signal.signal(signal.SIGALRM, original_handler)
