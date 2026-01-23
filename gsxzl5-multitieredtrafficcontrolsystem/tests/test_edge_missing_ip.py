
from api_server import APIServer

def test_edge_missing_ip():
    server = APIServer()
    # Missing IP key
    req = {'path': '/weather', 'user_id': None, 'payload': {}}
    res = server.handle_request(req)
    assert res['status'] in [200, 404, 429, 403, 401]
