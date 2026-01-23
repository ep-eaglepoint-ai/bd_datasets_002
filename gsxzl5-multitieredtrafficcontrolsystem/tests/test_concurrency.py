
import sys
import os
import threading
import time

sys.path.append(os.path.join(os.getcwd(), 'repository_after'))

from api_server import APIServer

def worker(server, ip, failures):
    try:
        res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        # Just ensure no exceptions thrown and status is valid
        if res['status'] not in [200, 429, 403]:
            failures.append(f"Invalid status {res['status']}")
    except Exception as e:
        failures.append(str(e))

def test_concurrency():
    server = APIServer()
    ip = "10.0.0.99"
    
    print("Testing Concurrency (Multiple Threads)...")
    
    threads = []
    failures = []
    
    # Launch 50 threads
    for _ in range(50):
        t = threading.Thread(target=worker, args=(server, ip, failures))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    if failures:
        print(f"Failures experienced: {failures}")
        assert False, f"Concurrency test failed with errors: {failures}"
        
    print("Concurrency passed (no exceptions).")

if __name__ == "__main__":
    test_concurrency()
