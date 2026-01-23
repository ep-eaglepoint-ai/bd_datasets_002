
from api_server import APIServer

def test_rl_ban_trigger():
    server = APIServer()
    ip = "3.3.3.3"
    
    # Consume quota
    for _ in range(100):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    # Trigger 5 violations
    for _ in range(5):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    # 6th violation should be ban (403)
    res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    assert res['status'] == 403, f"Expected 403, got {res['status']}"
