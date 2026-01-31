
from api_server import APIServer

def test_func_login_valid():
    server = APIServer()
    req = {'path': '/login', 'ip': '1.1.1.1', 'user_id': None, 'payload': {'user': 'admin', 'pwd': 'secret'}}
    res = server.handle_request(req)
    assert res['status'] == 200
