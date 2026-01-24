
from api_server import APIServer
import os
import sys
import pytest

try:
    import api_server
    IS_OPTIMIZED = hasattr(api_server, 'RateLimiter')
except ImportError:
    IS_OPTIMIZED = False

def test_rl_ban_trigger():
    server = APIServer()
    ip = "3.3.3.3"
    
    for _ in range(100):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    for _ in range(5):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    
    if IS_OPTIMIZED:
        assert res['status'] == 403, f"Expected 403, got {res['status']}"
    else:
        assert res['status'] == 403, f"Expected 403 (Baseline Expected Fail), got {res['status']}"
