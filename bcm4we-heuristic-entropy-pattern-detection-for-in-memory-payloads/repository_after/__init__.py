"""
Heuristic Entropy & Pattern Detection for In-Memory Payloads

This package implements a streaming analyzer that detects shellcode in memory dumps
by combining statistical analysis (entropy) with structural analysis (assembly patterns).
"""

from .detector import PayloadDetector
from .entropy import calculate_entropy
from .patterns import detect_nop_sled, detect_xor_patterns, detect_getpc_stub
from .formatter import format_output
from .main import main

__all__ = [
    'PayloadDetector',
    'calculate_entropy',
    'detect_nop_sled',
    'detect_xor_patterns',
    'detect_getpc_stub',
    'format_output',
    'main',
]
