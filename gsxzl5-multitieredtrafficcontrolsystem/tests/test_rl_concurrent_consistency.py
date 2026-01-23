
from api_server import APIServer
import time

def test_rl_concurrent_consistency():
    # Only meaningful if we force race conditions, handled by test_concurrency.py
    # Here we just verify basic consistency of state after operations
    server = APIServer()
    if hasattr(server, 'limiter'):
        bucket = server.limiter.check_limit("test_key", 10, 1.0)
        assert bucket['remaining'] == 9
        bucket = server.limiter.check_limit("test_key", 10, 1.0)
        assert bucket['remaining'] == 8
