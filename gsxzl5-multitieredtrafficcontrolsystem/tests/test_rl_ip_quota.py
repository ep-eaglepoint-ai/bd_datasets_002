
from api_server import APIServer
import pytest
import os
import sys

# Feature detection
try:
    import api_server
    IS_OPTIMIZED = hasattr(api_server, 'RateLimiter')
except ImportError:
    IS_OPTIMIZED = False

def test_rl_ip_quota():
    server = APIServer()
    for _ in range(100):
        res = server.handle_request({'path': '/weather', 'ip': '2.2.2.2', 'user_id': None, 'payload': {}})
        pass
        
    res = server.handle_request({'path': '/weather', 'ip': '2.2.2.2', 'user_id': None, 'payload': {}})
    
    if IS_OPTIMIZED:
        assert res['status'] == 429, f"Expected 429, got {res['status']}"
    else:
        assert res['status'] == 429, f"Expected 429 (Baseline Expected Fail), got {res['status']}"
