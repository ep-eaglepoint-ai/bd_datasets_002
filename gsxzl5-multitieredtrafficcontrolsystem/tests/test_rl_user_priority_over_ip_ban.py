
from api_server import APIServer

def test_rl_user_priority_over_ip_ban():
    server = APIServer()
    ip = "8.8.8.8"
    user = "vip"
    
    # Ban IP
    for _ in range(100): server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    for _ in range(6): server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': user, 'payload': {}})
    
    assert res['status'] == 200 # Should allow
