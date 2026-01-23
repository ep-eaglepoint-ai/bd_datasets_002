
from api_server import APIServer

def test_rl_ban_enforcement():
    server = APIServer()
    ip = "4.4.4.4"
    
    # We assume helper to manually ban or just trigger it.
    # Triggering is safer as it uses public API.
    for _ in range(100): server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    for _ in range(6): server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    # Keep hitting it
    res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    assert res['status'] == 403, f"Expected 403, got {res['status']}"
    assert 'Forbidden' in res.get('error', '')
