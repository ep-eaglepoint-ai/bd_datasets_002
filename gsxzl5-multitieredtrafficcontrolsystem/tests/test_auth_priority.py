
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'repository_after'))

from api_server import APIServer

def test_auth_priority():
    server = APIServer()
    ip = "10.0.0.5"
    user = "vip_user"
    
    print("Testing Auth Priority over IP Ban...")
    
    # 1. Ban the IP
    # Consume 100 tokens
    for _ in range(100):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    
    # Trigger 5 violations
    for _ in range(5):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    # Verify IP is banned
    res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
    if res['status'] != 403:
        print("Setup failed: IP not banned.")
        return False
        
    print("IP is banned.")
    
    # 2. Try with Authenticated User from SAME IP
    # Logged in user should use user capacity and bypass IP ban.
    
    req = {'path': '/weather', 'ip': ip, 'user_id': user, 'payload': {}}
    res = server.handle_request(req)
    
    if res['status'] == 200:
        print("Authenticated user passed despite IP ban.")
    else:
        print(f"Authenticated user blocked with status {res['status']}. Error: {res.get('error')}")
        assert False, f"Authenticated user blocked: {res.get('error')}"

if __name__ == "__main__":
    test_auth_priority()

