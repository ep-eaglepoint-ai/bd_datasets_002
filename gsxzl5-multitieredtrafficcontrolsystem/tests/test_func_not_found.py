
from api_server import APIServer

def test_func_not_found():
    server = APIServer()
    req = {'path': '/unknown', 'ip': '1.1.1.1', 'user_id': None, 'payload': {}}
    res = server.handle_request(req)
    assert res['status'] == 404
