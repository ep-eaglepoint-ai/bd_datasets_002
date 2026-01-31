
from api_server import APIServer
import os
import sys
import pytest

# Feature detection
try:
    import api_server
    IS_OPTIMIZED = hasattr(api_server, 'RateLimiter')
except ImportError:
    IS_OPTIMIZED = False

def test_rl_user_quota():
    server = APIServer()
    user = "heavy_user"
    for _ in range(1000):
        server.handle_request({'path': '/weather', 'ip': '2.2.2.2', 'user_id': user, 'payload': {}})
        
    res = server.handle_request({'path': '/weather', 'ip': '2.2.2.2', 'user_id': user, 'payload': {}})
    
    if IS_OPTIMIZED:
        assert res['status'] == 429, f"Expected 429, got {res['status']}"
    else:
        assert res['status'] == 429, f"Expected 429 (Baseline Expected Fail), got {res['status']}"
