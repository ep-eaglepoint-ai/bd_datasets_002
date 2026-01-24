
import sys
import os
import time
import statistics

from api_server import APIServer

def test_performance_and_headers():
    server = APIServer()
    ip = "10.0.0.1"
    
    print("Testing Headers and Performance (<2ms P99)...")
    
    latencies = []
    
    # Warmup
    for _ in range(100):
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
    # Measure 2000 requests
    start_time = time.time()
    for _ in range(2000):
        t0 = time.time()
        res = server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        t1 = time.time()
        latencies.append((t1 - t0) * 1000) # ms
        
        # Verify Headers on first request
        if _ == 0:
            headers = res.get('headers', {})
            if 'X-RateLimit-Limit' not in headers or 'X-RateLimit-Remaining' not in headers or 'Retry-After' not in headers:
                print(f"Missing headers: {headers}")
                return False

    total_time = time.time() - start_time
    rps = 2000 / total_time
    p99 = statistics.quantiles(latencies, n=100)[98] # approx P99
    
    if p99 > 2.0:
        print("P99 latency exceeded 2ms!")
        assert False, f"P99 latency {p99} > 2ms"
        
    print("Performance and Headers passed.")

if __name__ == "__main__":
    test_performance_and_headers()

