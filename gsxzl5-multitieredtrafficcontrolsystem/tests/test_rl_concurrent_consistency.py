
from api_server import APIServer
import time

def test_rl_concurrent_consistency():
    server = APIServer()
    if hasattr(server, 'limiter'):
        bucket = server.limiter.check_limit("test_key", 10, 1.0)
        assert bucket['remaining'] == 9
        bucket = server.limiter.check_limit("test_key", 10, 1.0)
        assert bucket['remaining'] == 8
