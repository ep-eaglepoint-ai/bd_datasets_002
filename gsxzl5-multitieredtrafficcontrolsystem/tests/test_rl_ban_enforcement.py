
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

def test_rl_ban_enforcement():
    server = APIServer()
    ip = "4.4.4.4"
    
    for _ in range(100): server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    for _ in range(6): server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    
    if IS_OPTIMIZED:
        assert res['status'] == 403, f"Expected 403, got {res['status']}"
        assert 'Forbidden' in res.get('error', '')
    else:
        assert res['status'] == 403, f"Expected 403 (Baseline Expected Fail), got {res['status']}"
