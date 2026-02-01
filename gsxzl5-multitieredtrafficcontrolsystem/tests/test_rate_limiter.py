
import sys
import os
import time
import pytest
from api_server import APIServer

# Determine if we are running against the Optimized implementation
try:
    import api_server
    IS_OPTIMIZED = hasattr(api_server, 'RateLimiter')
except ImportError:
    IS_OPTIMIZED = False

def test_rate_limiter():
    server = APIServer()
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
        if IS_OPTIMIZED:
            assert False, "Expected 429"
        else:
            assert False, "Expected 429 (Baseline Expected Fail)"
    
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
    hit_limit = False
    for i in range(50):
        req = {'path': '/weather', 'ip': '127.0.0.2', 'user_id': client_id, 'payload': {}}
        res = server.handle_request(req)
        if res['status'] in [429, 403]:
            hit_limit = True
            break
            
    if not hit_limit:
         print(f"Expected 429/403 under strict limit, but never hit it in 50 requests")
         if IS_OPTIMIZED:
             assert False, "Expected 429/403 under strict limit"
         else:
             assert False, "Expected 429/403 under strict limit (Baseline Expected Fail)"

    print("Reputation Engine passed.")

if __name__ == "__main__":
    test_rate_limiter()
    test_reputation_engine()
    print("\nAll tests passed!")


