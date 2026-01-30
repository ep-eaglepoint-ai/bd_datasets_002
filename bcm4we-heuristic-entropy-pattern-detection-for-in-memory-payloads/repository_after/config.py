"""
Configuration constants for the payload detector.
"""

import struct  # Used for Little-Endian address parsing (x64 Linux requirement)
                # Used in patterns.py for extracting loop counters and address parsing
                # Use struct.unpack('<Q', ...) for 64-bit addresses, '<I' for 32-bit values

# File reading configuration
CHUNK_SIZE = 4096  # 4KB chunks
WINDOW_SIZE = 512  # Sliding window size
OVERLAP_SIZE = 256  # Overlap to catch payloads across chunk boundaries
NOP_CHECK_RANGE = 64  # Range to check for NOP sleds adjacent to high-entropy zones

# Detection thresholds
HIGH_ENTROPY_THRESHOLD = 6.5  # High entropy threshold (0-8 scale, where 8 is maximum entropy)
MIN_NOP_SLED_LENGTH = 16  # Minimum NOP sled length

# XOR decryption patterns (common shellcode decryption signatures)
XOR_PATTERNS = [
    b'\x31\xc9',  # xor ecx, ecx
    b'\x31\xdb',  # xor ebx, ebx
    b'\x31\xd2',  # xor edx, edx
    b'\x31\xc0',  # xor eax, eax
    b'\x31\xff',  # xor edi, edi
    b'\x31\xf6',  # xor esi, esi
]

# Confidence scoring weights (sum to 1.0)
CONFIDENCE_HIGH_ENTROPY = 0.35
CONFIDENCE_NOP_SLED = 0.25
CONFIDENCE_XOR_PATTERN = 0.25
CONFIDENCE_GETPC_STUB = 0.15
CONFIDENCE_THRESHOLD = 0.7  # Minimum confidence to report detection

# Window analysis
MIN_WINDOW_SIZE = 64  # Minimum window size for analysis
