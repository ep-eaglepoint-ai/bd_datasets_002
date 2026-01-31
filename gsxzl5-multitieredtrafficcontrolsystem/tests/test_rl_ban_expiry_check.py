
from api_server import APIServer
import time

def test_rl_ban_expiry_check():
    server = APIServer()
    if hasattr(server, 'limiter'):
        key = "ip:10.10.10.10"
        with server.limiter.lock:
             server.limiter.buckets[key] = {
                'tokens': 10,
                'last_update': time.time(),
                'violations': 10,
                'ban_expiry': time.time() - 1,
                'violation_window_start': time.time()
             }
        
        res = server.handle_request({'path': '/weather', 'ip': '10.10.10.10', 'user_id': None, 'payload': {}})
        assert res['status'] == 200
