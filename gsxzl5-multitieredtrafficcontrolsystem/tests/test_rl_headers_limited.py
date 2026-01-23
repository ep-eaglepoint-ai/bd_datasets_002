
from api_server import APIServer

def test_rl_headers_limited():
    server = APIServer()
    ip = "6.6.6.6"
    for _ in range(101):
        res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    assert res['status'] == 429, f"Expected 429, got {res['status']}"
    headers = res.get('headers', {})
    assert headers['X-RateLimit-Remaining'] == '0'
