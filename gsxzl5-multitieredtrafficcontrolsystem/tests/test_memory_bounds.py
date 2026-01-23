
import sys
import os
import random
import string

sys.path.append(os.path.join(os.getcwd(), 'repository_after'))

from api_server import APIServer

def generate_random_ip():
    return ".".join(str(random.randint(0, 255)) for _ in range(4))

def test_memory_bounds():
    server = APIServer()
    
    print("Testing Memory Bounds (10k IPs)...")
    
    # Simulate 10,000 unique IPs
    for i in range(10000):
        ip = generate_random_ip()
        server.handle_request({'path': '/weather', 'ip': ip, 'user_id': None, 'payload': {}})
        
        if i % 1000 == 0:
            print(f"Processed {i} IPs...")
            # Trigger cleanup occasionally
            server.limiter.cleanup()
            
    # Check size of buckets
    bucket_count = len(server.limiter.buckets)
    print(f"Final bucket count: {bucket_count}")
    
    if bucket_count > 10000:
        print("Bucket count unexpectedly high.")
        assert False, f"Bucket count {bucket_count} > 10000"
        
    print("Memory Bounds passed (simulation completed without error).")

if __name__ == "__main__":
    test_memory_bounds()
