
from api_server import APIServer

def test_rl_retry_after_correct():
    server = APIServer()
    ip = "7.7.7.7"
    for _ in range(101):
        res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    headers = res.get('headers', {})
    assert 'Retry-After' in headers
    retry_after = float(headers['Retry-After'])
    assert retry_after > 0
