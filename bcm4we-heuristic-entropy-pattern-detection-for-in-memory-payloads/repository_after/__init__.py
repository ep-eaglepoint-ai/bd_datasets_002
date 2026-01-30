"""
Heuristic Entropy & Pattern Detection for In-Memory Payloads

This module implements a streaming analyzer that detects shellcode in memory dumps
by combining statistical analysis (entropy) with structural analysis (assembly patterns).
"""

import math
import os
import struct  # Imported for potential address parsing (Little-Endian requirement)
                # Currently unused as code tracks file offsets as integers rather than
                # parsing addresses from binary data. If address parsing is needed
                # (e.g., jump targets in shellcode), use struct.unpack('<Q', ...) for x64.
import sys
from typing import Generator, Tuple, List, Optional


class PayloadDetector:
    """Detects shellcode payloads using entropy and pattern analysis."""
    
    CHUNK_SIZE = 4096  # 4KB chunks
    WINDOW_SIZE = 512  # Sliding window size
    OVERLAP_SIZE = 256  # Overlap to catch payloads across chunk boundaries
    NOP_CHECK_RANGE = 64  # Range to check for NOP sleds adjacent to high-entropy zones
    
    # High entropy threshold (0-8 scale, where 8 is maximum entropy)
    HIGH_ENTROPY_THRESHOLD = 6.5
    
    # Minimum NOP sled length
    MIN_NOP_SLED_LENGTH = 16
    
    # XOR decryption patterns (common shellcode decryption signatures)
    XOR_PATTERNS = [
        b'\x31\xc9',  # xor ecx, ecx
        b'\x31\xdb',  # xor ebx, ebx
        b'\x31\xd2',  # xor edx, edx
        b'\x31\xc0',  # xor eax, eax
        b'\x31\xff',  # xor edi, edi
        b'\x31\xf6',  # xor esi, esi
    ]
    
    def __init__(self, file_path: str):
        """Initialize detector with file path."""
        self.file_path = file_path
        self.detections: List[Tuple[int, float, str]] = []  # (offset, confidence, reason)
    
    def calculate_entropy(self, data: bytes) -> float:
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
        byte_counts = {}
        for byte in data:
            byte_counts[byte] = byte_counts.get(byte, 0) + 1
        
        # Calculate entropy
        entropy = 0.0
        data_len = len(data)
        
        for count in byte_counts.values():
            probability = count / data_len
            if probability > 0:
                entropy -= probability * math.log2(probability)
        
        return entropy
    
    def detect_nop_sled(self, data: bytes, start_idx: int) -> Optional[int]:
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
        
        for i in range(start_idx, min(start_idx + self.WINDOW_SIZE, len(data))):
            if data[i] in nop_bytes:
                current_length += 1
                max_length = max(max_length, current_length)
            else:
                current_length = 0
        
        if max_length >= self.MIN_NOP_SLED_LENGTH:
            return max_length
        
        return None
    
    def detect_xor_patterns(self, data: bytes, start_idx: int) -> bool:
        """
        Detect XOR decryption patterns in the data.
        
        Args:
            data: Byte sequence to analyze
            start_idx: Starting index in the data
            
        Returns:
            True if XOR pattern detected, False otherwise
        """
        end_idx = min(start_idx + self.WINDOW_SIZE, len(data))
        window = data[start_idx:end_idx]
        
        # Check for XOR patterns
        for pattern in self.XOR_PATTERNS:
            if pattern in window:
                # Look for XOR loop structure (XOR followed by increment/loop)
                pattern_idx = window.find(pattern)
                if pattern_idx != -1 and pattern_idx + 2 < len(window):
                    # Check for common loop patterns after XOR
                    next_bytes = window[pattern_idx + 2:pattern_idx + 6]
                    # Look for increment (0x40-0x47 for registers) or loop (0xE2, 0xE0)
                    if any(b in next_bytes for b in [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0xE2, 0xE0]):
                        return True
        
        return False
    
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
        window_end = min(window_start + self.WINDOW_SIZE, len(data))
        window_data = data[window_start:window_end]
        
        if len(window_data) < 64:  # Too small to analyze
            return None
        
        # Calculate entropy
        entropy = self.calculate_entropy(window_data)
        
        # Check for high entropy
        has_high_entropy = entropy >= self.HIGH_ENTROPY_THRESHOLD
        
        # Check for NOP sled before high entropy region
        nop_sled_length_before = self.detect_nop_sled(data, max(0, window_start - self.NOP_CHECK_RANGE))
        
        # Check for NOP sled after high entropy region
        nop_sled_length_after = None
        if window_end < len(data):
            # detect_nop_sled will handle bounds checking internally
            nop_sled_length_after = self.detect_nop_sled(data, window_end)
        
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
        has_xor_pattern = self.detect_xor_patterns(data, window_start)
        
        # Calculate confidence score
        confidence = 0.0
        reasons = []
        
        if has_high_entropy:
            confidence += 0.4
            reasons.append("high_entropy")
        
        if nop_sled_length:
            confidence += 0.3
            reasons.append(f"nop_sled_{nop_sled_length}bytes")
        
        if has_xor_pattern:
            confidence += 0.3
            reasons.append("xor_decryption_pattern")
        
        # Require at least high entropy + one other indicator
        if confidence >= 0.7:
            offset = global_offset + window_start
            reason = "+".join(reasons)
            return (offset, confidence, reason)
        
        return None
    
    def read_file_chunks(self) -> Generator[Tuple[bytes, int], None, None]:
        """
        Read file in chunks with overlap to catch payloads across boundaries.
        
        Yields:
            Tuple of (chunk_data, global_offset)
        """
        try:
            with open(self.file_path, 'rb') as f:
                global_offset = 0
                previous_chunk_tail = b''
                
                while True:
                    chunk = f.read(self.CHUNK_SIZE)
                    if not chunk:
                        break
                    
                    # Combine with previous chunk's tail for overlap analysis
                    if previous_chunk_tail:
                        combined = previous_chunk_tail + chunk
                        yield (combined, global_offset - len(previous_chunk_tail))
                    else:
                        # First chunk - no overlap yet
                        yield (chunk, global_offset)
                    
                    # Save tail for next chunk overlap
                    if len(chunk) >= self.OVERLAP_SIZE:
                        previous_chunk_tail = chunk[-self.OVERLAP_SIZE:]
                    else:
                        # Chunk smaller than overlap - combine with previous tail
                        previous_chunk_tail = (previous_chunk_tail + chunk)[-self.OVERLAP_SIZE:]
                    
                    global_offset += len(chunk)
                    
        except IOError as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    
    def detect(self) -> List[Tuple[int, float, str]]:
        """
        Main detection method that processes the file and returns detections.
        
        Returns:
            List of tuples: (offset_hex, confidence, reason)
        """
        detections = []
        seen_offsets = set()  # Avoid duplicate detections
        
        for chunk_data, global_offset in self.read_file_chunks():
            # Slide window across chunk
            step_size = self.WINDOW_SIZE // 2  # 50% overlap between windows
            
            for window_start in range(0, len(chunk_data) - self.WINDOW_SIZE + 1, step_size):
                result = self.analyze_window(chunk_data, global_offset, window_start)
                
                if result:
                    offset, confidence, reason = result
                    # Avoid duplicates (within 256 bytes)
                    if offset not in seen_offsets and not any(abs(offset - s) < 256 for s in seen_offsets):
                        detections.append((offset, confidence, reason))
                        seen_offsets.add(offset)
        
        # Sort by confidence (highest first)
        detections.sort(key=lambda x: x[1], reverse=True)
        
        return detections
    
    def format_output(self, detections: List[Tuple[int, float, str]]) -> str:
        """
        Format detection results for output.
        
        Args:
            detections: List of detection tuples
            
        Returns:
            Formatted output string
        """
        if not detections:
            return "No shellcode detected"
        
        output_lines = []
        for offset, confidence, reason in detections:
            hex_offset = f"0x{offset:08X}"
            output_lines.append(f"{hex_offset}: {confidence:.2f} ({reason})")
        
        return "\n".join(output_lines)


def main():
    """Main entry point for the detector."""
    if len(sys.argv) != 2:
        print("Usage: python -m repository_after <memory_dump_file>", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # Validate file path
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    
    if not os.path.isfile(file_path):
        print(f"Error: Path is not a file: {file_path}", file=sys.stderr)
        sys.exit(1)
    
    if not os.access(file_path, os.R_OK):
        print(f"Error: File is not readable: {file_path}", file=sys.stderr)
        sys.exit(1)
    
    detector = PayloadDetector(file_path)
    detections = detector.detect()
    output = detector.format_output(detections)
    print(output)
    
    # Exit with appropriate code
    sys.exit(0 if detections else 1)


if __name__ == "__main__":
    main()
