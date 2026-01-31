
from api_server import APIServer

def test_edge_huge_payload():
    server = APIServer()
    payload = {"data": "x" * 100000}
    req = {'path': '/weather', 'ip': '9.9.9.9', 'user_id': None, 'payload': payload}
    res = server.handle_request(req)
    assert res['status'] == 200
