
import sys
import os

from api_server import APIServer

def test_auth_priority():
    server = APIServer()
    ip = "10.0.0.5"
    user = "vip_user"
    
    print("Testing Auth Priority over IP Ban...")
    
    for _ in range(100):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    for _ in range(5):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    if res['status'] != 403:
        print("Setup failed: IP not banned.")
        return False
        
    print("IP is banned.")
    
    req = {'path': '/weather', 'ip': ip, 'user_id': user, 'payload': {}}
    res = server.handle_request(req)
    
    if res['status'] == 200:
        print("Authenticated user passed despite IP ban.")
    else:
        print(f"Authenticated user blocked with status {res['status']}. Error: {res.get('error')}")
        assert False, f"Authenticated user blocked: {res.get('error')}"

if __name__ == "__main__":
    test_auth_priority()

