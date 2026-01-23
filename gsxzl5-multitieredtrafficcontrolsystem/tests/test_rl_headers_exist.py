
from api_server import APIServer

def test_rl_headers_exist():
    server = APIServer()
    res = server.handle_request({'path': '/weather', 'ip': '5.5.5.5', 'user_id': None, 'payload': {}})
    
    headers = res.get('headers', {})
    assert 'X-RateLimit-Limit' in headers
    assert 'X-RateLimit-Remaining' in headers
    assert 'Retry-After' in headers
