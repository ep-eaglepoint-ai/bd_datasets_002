
import sys
import os
import time

# Add repository_after to path
from api_server import APIServer

def test_transitions_and_ban():
    server = APIServer()
    ip = "192.168.1.100"
    
    print("Testing Transitions 200 -> 429 -> 403...")
    
    for i in range(100):
        req = {'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}}
        res = server.handle_request(req)
        if res['status'] != 200:
            print(f"Failed at request {i+1}: {res}")
            return False
            
    print("Consumed initial capacity.")
    
    for i in range(5):
        req = {'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}}
        res = server.handle_request(req)
        if res['status'] != 429:
             print(f"Expected 429 at violation {i+1}, got {res['status']}")
             return False
        # Optional: check headers
        if int(res['headers']['X-RateLimit-Remaining']) != 0:
             print("Header X-RateLimit-Remaining should be 0")
             return False
             
    print("Triggered 5 violations.")

    req = {'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}}
    res = server.handle_request(req)
    if res['status'] != 403:
        print(f"Expected 403 (Banned), got {res['status']}")
        return False
    
    retry_after = int(res['headers']['Retry-After'])
    if retry_after < 1790: # Allow some buffer
         print(f"Retry-After too low for ban: {retry_after}")
         assert False, f"Retry-After {retry_after} too low"
         
    print("Ban verified successfully.")

if __name__ == "__main__":
    test_transitions_and_ban()

