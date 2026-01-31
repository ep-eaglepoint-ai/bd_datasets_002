
from api_server import APIServer

def test_func_weather_london():
    server = APIServer()
    req = {'path': '/weather', 'ip': '1.1.1.1', 'user_id': None, 'payload': {}}
    res = server.handle_request(req)
    assert res['status'] == 200
    assert res['data']['city'] == "London"
