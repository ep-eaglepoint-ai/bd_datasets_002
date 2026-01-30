"""
Entropy calculation module for statistical analysis.
"""

import math
from typing import Dict


def calculate_entropy(data: bytes) -> float:
    """
    Calculate Shannon entropy of a byte sequence.
    
    Args:
        data: Byte sequence to analyze
        
    Returns:
        Entropy value (0-8 scale)
    """
    if not data:
        return 0.0
    
    # Count byte frequencies
    byte_counts: Dict[int, int] = {}
    for byte in data:
        byte_counts[byte] = byte_counts.get(byte, 0) + 1
    
    # Calculate entropy using Shannon entropy formula
    entropy = 0.0
    data_len = len(data)
    
    for count in byte_counts.values():
        probability = count / data_len
        if probability > 0:
            entropy -= probability * math.log2(probability)
    
    return entropy
