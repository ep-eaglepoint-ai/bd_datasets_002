
from api_server import APIServer
import os
import sys
import pytest

try:
    import api_server
    IS_OPTIMIZED = hasattr(api_server, 'RateLimiter')
except ImportError:
    IS_OPTIMIZED = False

def test_rl_headers_exist():
    server = APIServer()
    res = server.handle_request({'path': '/weather', 'ip': '5.5.5.5', 'user_id': None, 'payload': {}})
    
    headers = res.get('headers', {})
    
    if IS_OPTIMIZED:
        assert 'X-RateLimit-Limit' in headers
        assert 'X-RateLimit-Remaining' in headers
        assert 'Retry-After' in headers
    else:
        assert 'X-RateLimit-Limit' in headers, "Missing header (Baseline Expected Fail)"
