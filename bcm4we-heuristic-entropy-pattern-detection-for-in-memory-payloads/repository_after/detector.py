"""
Main payload detector class that orchestrates detection logic.
"""

from typing import List, Tuple, Optional, Generator
from .config import (
    CHUNK_SIZE, WINDOW_SIZE, OVERLAP_SIZE, NOP_CHECK_RANGE, HIGH_ENTROPY_THRESHOLD,
    CONFIDENCE_HIGH_ENTROPY, CONFIDENCE_NOP_SLED, CONFIDENCE_XOR_PATTERN,
    CONFIDENCE_GETPC_STUB, CONFIDENCE_THRESHOLD, MIN_WINDOW_SIZE
)
from .entropy import calculate_entropy
from .patterns import detect_nop_sled, detect_xor_patterns, detect_getpc_stub
from .file_reader import read_file_chunks
from .formatter import format_output


class PayloadDetector:
    """Detects shellcode payloads using entropy and pattern analysis."""
    
    # Class attributes for backward compatibility with tests
    CHUNK_SIZE = CHUNK_SIZE
    WINDOW_SIZE = WINDOW_SIZE
    OVERLAP_SIZE = OVERLAP_SIZE
    
    def __init__(self, file_path: str):
        """Initialize detector with file path."""
        self.file_path = file_path
        self.detections: List[Tuple[int, float, str]] = []  # (offset, confidence, reason)
    
    # Wrapper methods for backward compatibility with tests
    def calculate_entropy(self, data: bytes) -> float:
        """
        Calculate Shannon entropy of a byte sequence.
        
        Wrapper method for backward compatibility.
        
        Args:
            data: Byte sequence to analyze
            
        Returns:
            Entropy value (0-8 scale)
        """
        return calculate_entropy(data)
    
    def detect_nop_sled(self, data: bytes, start_idx: int) -> Optional[int]:
        """
        Detect NOP sled (sequences of 0x90 or other NOP-like bytes).
        
        Wrapper method for backward compatibility.
        
        Args:
            data: Byte sequence to analyze
            start_idx: Starting index in the data
            
        Returns:
            Length of NOP sled if found, None otherwise
        """
        return detect_nop_sled(data, start_idx)
    
    def detect_xor_patterns(self, data: bytes, start_idx: int) -> bool:
        """
        Detect XOR decryption patterns in the data.
        
        Wrapper method for backward compatibility.
        
        Args:
            data: Byte sequence to analyze
            start_idx: Starting index in the data
            
        Returns:
            True if XOR pattern detected, False otherwise
        """
        has_xor, _ = detect_xor_patterns(data, start_idx)
        return has_xor
    
    def read_file_chunks(self) -> Generator[Tuple[bytes, int], None, None]:
        """
        Read file in chunks with overlap to catch payloads across boundaries.
        
        Wrapper method for backward compatibility.
        
        Yields:
            Tuple of (chunk_data, global_offset)
        """
        return read_file_chunks(self.file_path)
    
    def format_output(self, detections: List[Tuple[int, float, str]]) -> str:
        """
        Format detection results for output.
        
        Wrapper method for backward compatibility.
        
        Args:
            detections: List of detection tuples (offset, confidence, reason)
            
        Returns:
            Formatted output string
        """
        return format_output(detections)
    
    def analyze_window(self, data: bytes, global_offset: int, window_start: int) -> Optional[Tuple[int, float, str]]:
        """
        Analyze a sliding window for shellcode indicators.
        
        Args:
            data: Current chunk data
            global_offset: Global file offset of this chunk
            window_start: Start index within the chunk
            
        Returns:
            Tuple of (offset, confidence, reason) if detected, None otherwise
        """
        window_end = min(window_start + WINDOW_SIZE, len(data))
        window_data = data[window_start:window_end]
        
        if len(window_data) < MIN_WINDOW_SIZE:  # Too small to analyze
            return None
        
        # Calculate entropy
        entropy = calculate_entropy(window_data)
        
        # Check for high entropy
        has_high_entropy = entropy >= HIGH_ENTROPY_THRESHOLD
        
        # Check for NOP sled before high entropy region
        nop_sled_length_before = detect_nop_sled(data, max(0, window_start - NOP_CHECK_RANGE))
        
        # Check for NOP sled after high entropy region
        nop_sled_length_after = None
        if window_end < len(data):
            # detect_nop_sled will handle bounds checking internally
            nop_sled_length_after = detect_nop_sled(data, window_end)
        
        # Use the longer NOP sled if both found, otherwise use whichever is available
        if nop_sled_length_before and nop_sled_length_after:
            nop_sled_length = max(nop_sled_length_before, nop_sled_length_after)
        elif nop_sled_length_before:
            nop_sled_length = nop_sled_length_before
        elif nop_sled_length_after:
            nop_sled_length = nop_sled_length_after
        else:
            nop_sled_length = None
        
        # Check for XOR patterns
        has_xor_pattern, loop_counter = detect_xor_patterns(data, window_start)
        
        # Check for GetPC stub
        has_getpc_stub = detect_getpc_stub(data, window_start)
        
        # Calculate confidence score
        confidence = 0.0
        reasons = []
        
        if has_high_entropy:
            confidence += CONFIDENCE_HIGH_ENTROPY
            reasons.append("high_entropy")
        
        if nop_sled_length:
            confidence += CONFIDENCE_NOP_SLED
            reasons.append(f"nop_sled_{nop_sled_length}bytes")
        
        if has_xor_pattern:
            confidence += CONFIDENCE_XOR_PATTERN
            reason_str = "xor_decryption_pattern"
            if loop_counter is not None:
                reason_str += f"_loop{loop_counter}"
            reasons.append(reason_str)
        
        if has_getpc_stub:
            confidence += CONFIDENCE_GETPC_STUB
            reasons.append("getpc_stub")
        
        # Require at least high entropy + one other indicator
        if confidence >= CONFIDENCE_THRESHOLD:
            offset = global_offset + window_start
            reason = "+".join(reasons)
            return (offset, confidence, reason)
        
        return None
    
    def detect(self) -> List[Tuple[int, float, str]]:
        """
        Main detection method that processes the file and returns detections.
        
        Returns:
            List of tuples: (offset, confidence, reason)
        """
        detections = []
        seen_offsets = set()  # Avoid duplicate detections
        
        for chunk_data, global_offset in read_file_chunks(self.file_path):
            # Slide window across chunk
            step_size = WINDOW_SIZE // 2  # 50% overlap between windows
            
            # Fix: Handle chunks smaller than WINDOW_SIZE
            max_start = max(0, len(chunk_data) - WINDOW_SIZE + 1)
            for window_start in range(0, max_start, step_size):
                result = self.analyze_window(chunk_data, global_offset, window_start)
                
                if result:
                    offset, confidence, reason = result
                    # Avoid duplicates (within 256 bytes)
                    if offset not in seen_offsets and not any(abs(offset - s) < 256 for s in seen_offsets):
                        detections.append((offset, confidence, reason))
                        seen_offsets.add(offset)
            
            # Handle the case where chunk is smaller than WINDOW_SIZE
            # Analyze the entire chunk as a single window if it's large enough
            if len(chunk_data) < WINDOW_SIZE and len(chunk_data) >= MIN_WINDOW_SIZE:
                result = self.analyze_window(chunk_data, global_offset, 0)
                if result:
                    offset, confidence, reason = result
                    if offset not in seen_offsets and not any(abs(offset - s) < 256 for s in seen_offsets):
                        detections.append((offset, confidence, reason))
                        seen_offsets.add(offset)
        
        # Sort by confidence (highest first)
        detections.sort(key=lambda x: x[1], reverse=True)
        
        return detections
