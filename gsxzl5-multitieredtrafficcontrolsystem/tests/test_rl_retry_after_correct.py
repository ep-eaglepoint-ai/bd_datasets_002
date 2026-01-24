
from api_server import APIServer
import os
import sys
import pytest

try:
    import api_server
    IS_OPTIMIZED = hasattr(api_server, 'RateLimiter')
except ImportError:
    IS_OPTIMIZED = False

def test_rl_retry_after_correct():
    server = APIServer()
    ip = "7.7.7.7"
    for _ in range(101):
        res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    headers = res.get('headers', {})
    if IS_OPTIMIZED:
        assert 'Retry-After' in headers
        retry_after = float(headers['Retry-After'])
        assert retry_after > 0
    else:
        assert 'Retry-After' in headers, "Expected Retry-After (Baseline Expected Fail)"
