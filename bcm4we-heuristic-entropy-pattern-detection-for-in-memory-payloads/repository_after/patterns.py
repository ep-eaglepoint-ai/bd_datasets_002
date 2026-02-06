"""
Pattern detection module for identifying shellcode indicators.
"""

import struct
from typing import Optional, Tuple
from .config import WINDOW_SIZE, MIN_NOP_SLED_LENGTH, XOR_PATTERNS


def detect_nop_sled(data: bytes, start_idx: int) -> Optional[int]:
    """
    Detect NOP sled (sequences of 0x90 or other NOP-like bytes).
    
    Args:
        data: Byte sequence to analyze
        start_idx: Starting index in the data
        
    Returns:
        Length of NOP sled if found, None otherwise
    """
    nop_bytes = [0x90]  # NOP instruction (0x90) - primary NOP sled indicator
    max_length = 0
    current_length = 0
    
    end_idx = min(start_idx + WINDOW_SIZE, len(data))
    
    for i in range(start_idx, end_idx):
        if data[i] in nop_bytes:
            current_length += 1
            max_length = max(max_length, current_length)
        else:
            current_length = 0
    
    if max_length >= MIN_NOP_SLED_LENGTH:
        return max_length
    
    return None


def detect_xor_patterns(data: bytes, start_idx: int) -> Tuple[bool, Optional[int]]:
    """
    Detect XOR decryption patterns in the data and extract loop counter if possible.
    
    Args:
        data: Byte sequence to analyze
        start_idx: Starting index in the data
        
    Returns:
        Tuple of (pattern_detected, loop_counter_value)
        loop_counter_value is None if not extractable
    """
    end_idx = min(start_idx + WINDOW_SIZE, len(data))
    window = data[start_idx:end_idx]
    loop_counter = None
    
    # Check for XOR patterns
    for pattern in XOR_PATTERNS:
        pattern_idx = window.find(pattern)
        if pattern_idx != -1:
            # Look for XOR loop structure (XOR followed by increment/loop)
            if pattern_idx + 2 < len(window):
                next_bytes = window[pattern_idx + 2:pattern_idx + 10]
                
                # Check for increment (0x40-0x47 for registers) or loop (0xE2, 0xE0)
                has_loop_structure = any(b in next_bytes[:4] for b in [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0xE2, 0xE0])
                
                if has_loop_structure:
                    # Try to extract loop counter from common patterns
                    # Pattern: xor reg, reg; mov reg, <counter>; loop/xor
                    # Look for mov immediate after XOR (common in Metasploit payloads)
                    for i in range(pattern_idx + 2, min(pattern_idx + 20, len(window) - 4)):
                        # Check for mov reg, imm32 pattern (0xB8-0xBF for mov eax-edi, imm32)
                        if 0xB8 <= window[i] <= 0xBF:
                            try:
                                # Extract 32-bit immediate value (little-endian)
                                loop_counter = struct.unpack('<I', window[i+1:i+5])[0]
                                break
                            except (IndexError, struct.error):
                                pass
                    
                    return (True, loop_counter)
    
    return (False, None)


def detect_getpc_stub(data: bytes, start_idx: int) -> bool:
    """
    Detect GetPC (Get Program Counter) stub patterns commonly used in shellcode.
    
    Common GetPC patterns:
    1. call $+5; pop (E8 00 00 00 00 followed by 58/59/5A/5B/5C/5D/5E/5F)
    2. fldz; fnstenv (D9 EE; D9 74 24 F4)
    3. call next; next: pop (E8 00 00 00 00; 58/59/5A/5B/5C/5D/5E/5F)
    
    Args:
        data: Byte sequence to analyze
        start_idx: Starting index in the data
        
    Returns:
        True if GetPC stub detected, False otherwise
    """
    end_idx = min(start_idx + WINDOW_SIZE, len(data))
    window = data[start_idx:end_idx]
    
    # Pattern 1: call $+5; pop reg
    # E8 00 00 00 00 = call $+5 (relative call with 0 offset)
    # 58-5F = pop eax/ecx/edx/ebx/esp/ebp/esi/edi
    if len(window) >= 6:
        if window[0:5] == b'\xE8\x00\x00\x00\x00':
            if 0x58 <= window[5] <= 0x5F:  # pop reg
                return True
    
    # Pattern 2: fldz; fnstenv [esp-0xC]
    # D9 EE = fldz
    # D9 74 24 F4 = fnstenv [esp-0xC]
    if len(window) >= 5:
        if window[0:2] == b'\xD9\xEE':  # fldz
            if window[2:5] == b'\xD9\x74\x24':  # fnstenv [esp-...]
                return True
    
    # Pattern 3: call next; next: pop (search for call followed by pop within 10 bytes)
    for i in range(len(window) - 6):
        if window[i] == 0xE8:  # call opcode
            # Check if followed by pop within next 10 bytes
            for j in range(i + 1, min(i + 11, len(window))):
                if 0x58 <= window[j] <= 0x5F:  # pop reg
                    return True
    
    return False
