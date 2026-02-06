"""
Broken implementation example - loads entire file into memory (violates requirement).
"""

def detect_payload(file_path):
    # BAD: Loading entire file into memory
    with open(file_path, 'rb') as f:
        data = f.read()  # This will fail for 2GB files!
    
    # Missing entropy calculation
    # Missing NOP sled detection
    # Missing XOR pattern detection
    return "Found" if len(data) > 0 else "Not Found"
