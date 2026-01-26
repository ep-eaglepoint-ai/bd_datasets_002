
from api_server import APIServer
import os
import sys
import pytest

try:
    import api_server
    IS_OPTIMIZED = hasattr(api_server, 'RateLimiter')
except ImportError:
    IS_OPTIMIZED = False

def test_rl_headers_limited():
    server = APIServer()
    ip = "6.6.6.6"
    for _ in range(101):
        res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    
    if IS_OPTIMIZED:
        assert res['status'] == 429, f"Expected 429, got {res['status']}"
        headers = res.get('headers', {})
        assert headers['X-RateLimit-Remaining'] == '0'
    else:
        assert res['status'] == 429, f"Expected 429 (Baseline Expected Fail), got {res['status']}"
