
from api_server import APIServer

def test_func_login_invalid():
    server = APIServer()
    req = {'path': '/login', 'ip': '1.1.1.1', 'user_id': None, 'payload': {'user': 'admin', 'pwd': 'wrong'}}
    res = server.handle_request(req)
    assert res['status'] == 401
