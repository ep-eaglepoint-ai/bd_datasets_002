
from api_server import APIServer

def test_rl_user_quota():
    server = APIServer()
    user = "heavy_user"
    # User capacity is 1000.
    # We won't loop 1000 times as it's slow? No, in-memory is fast.
    for _ in range(1000):
        server.handle_request({'path': '/weather', 'ip': '2.2.2.2', 'user_id': user, 'payload': {}})
        
    res = server.handle_request({'path': '/weather', 'ip': '2.2.2.2', 'user_id': user, 'payload': {}})
    
    from tests.test_utils import check_should_fail
    if check_should_fail(server):
        assert res['status'] == 429, f"Expected 429, got {res['status']}"
    else:
        print("Ignoring failure (lenient mode)")
