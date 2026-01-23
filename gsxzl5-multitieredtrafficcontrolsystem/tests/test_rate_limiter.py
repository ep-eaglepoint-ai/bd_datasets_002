
import sys
import os
import time

# Add repository_after to path so we can import api_server
sys.path.append(os.path.join(os.getcwd(), 'repository_after'))

from api_server import APIServer

def test_rate_limiter():
    server = APIServer()
    # Use IP limit (100) instead of User limit (1000) for faster test
    client_id = None 
    
    print("Testing Rate Limiter...")
    # 1. Normal traffic (100 requests)
    for i in range(100):
        req = {'path': '/weather', 'ip': '127.0.0.1', 'user_id': client_id, 'payload': {}}
        res = server.handle_request(req)
        if res['status'] != 200:
             print(f"Failed at request {i+1}: {res}")
             assert False, f"Failed at request {i+1}"
    
    # 2. Exceed limit (101st request)
    req = {'path': '/weather', 'ip': '127.0.0.1', 'user_id': client_id, 'payload': {}}
    res = server.handle_request(req)
    if res['status'] != 429:
        print(f"Expected 429, got {res['status']}")
        assert False, "Expected 429"
    
    print("Rate Limiter passed.")


def test_reputation_engine():
    server = APIServer()
    client_id = "bad_actor"
    
    print("\nTesting Reputation Engine...")
    
    # 1. Fail login multiple times
    for i in range(3):
        req = {'path': '/login', 'ip': '127.0.0.2', 'user_id': client_id, 'payload': {'user': 'admin', 'pwd': 'wrong_password'}}
        res = server.handle_request(req)
        if res['status'] != 401:
             print(f"Expected 401, got {res['status']}")
             assert False, f"Expected 401, got {res['status']}"
             
    # 2. Verify stricter limit (Capacity 10)
    # Poll until we hit the limit
    hit_limit = False
    for i in range(50):
        req = {'path': '/weather', 'ip': '127.0.0.2', 'user_id': client_id, 'payload': {}}
        res = server.handle_request(req)
        # We accept 429 (Rate Limit) or 403 (Ban) if we spammed too hard too fast
        if res['status'] in [429, 403]:
            hit_limit = True
            break
            
    if not hit_limit:
         print(f"Expected 429/403 under strict limit, but never hit it in 50 requests")
         assert False, "Expected 429/403 under strict limit"

    print("Reputation Engine passed.")

if __name__ == "__main__":
    test_rate_limiter()
    test_reputation_engine()
    print("\nAll tests passed!")


