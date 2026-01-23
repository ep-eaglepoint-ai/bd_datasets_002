
from api_server import APIServer
import pytest

def test_rl_ip_quota():
    server = APIServer()
    # Consume 100 requests (IP capacity)
    for _ in range(100):
        res = server.handle_request({'path': '/weather', 'ip': '2.2.2.2', 'user_id': None, 'payload': {}})
        # repository_before will always return 200, so we don't assert 200 unless we want to fail it.
        # But this test checks QUOTA enforcement.
        pass
        
    # 101st request
    res = server.handle_request({'path': '/weather', 'ip': '2.2.2.2', 'user_id': None, 'payload': {}})
    
    # Strict check: Must return 429
    assert res['status'] == 429, f"Expected 429, got {res['status']}"
