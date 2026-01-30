"""
Working implementation example - reads in chunks and implements all requirements.
"""

import math
import struct

def calculate_entropy(data):
    """Calculate Shannon entropy."""
    if not data:
        return 0.0
    byte_counts = {}
    for byte in data:
        byte_counts[byte] = byte_counts.get(byte, 0) + 1
    entropy = 0.0
    data_len = len(data)
    for count in byte_counts.values():
        probability = count / data_len
        if probability > 0:
            entropy -= probability * math.log2(probability)
    return entropy

def detect_payload(file_path):
    """Detect payload using chunked reading."""
    CHUNK_SIZE = 4096
    detections = []
    
    # GOOD: Reading in chunks
    with open(file_path, 'rb') as f:
        offset = 0
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            
            # Analyze chunk
            entropy = calculate_entropy(chunk)
            if entropy > 6.5:
                # Check for patterns
                if b'\x90' * 16 in chunk:
                    detections.append((offset, entropy, "high_entropy+nop_sled"))
            
            offset += len(chunk)
    
    return detections
