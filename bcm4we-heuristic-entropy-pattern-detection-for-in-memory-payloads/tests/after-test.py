"""
Test suite for repository_after/ (should pass with full implementation).
"""

import os
import sys
import tempfile
import pytest
import struct
import math

# Add repository_after to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from repository_after import PayloadDetector


def create_test_file_with_shellcode():
    """Create a test file with simulated shellcode (NOP sled + high entropy + XOR pattern)."""
    # Create a temporary file
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write some normal data
            f.write(b'\x00' * 1000)
            
            # Write NOP sled (0x90 bytes)
            f.write(b'\x90' * 32)
            
            # Write high entropy data (simulated encrypted payload)
            # Use random-like bytes for high entropy
            high_entropy = bytes([(i * 17 + 13) % 256 for i in range(512)])
            f.write(high_entropy)
            
            # Write XOR decryption pattern
            f.write(b'\x31\xc9\x41\xE2')  # xor ecx, ecx; inc ecx; loop
            
            # Write more normal data
            f.write(b'\x00' * 500)
            
        return path
    except Exception:
        os.unlink(path)
        raise


def create_test_file_without_shellcode():
    """Create a test file without shellcode (low entropy, no patterns)."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write low entropy data (zeros and repeating patterns)
            f.write(b'\x00' * 2000)
            f.write(b'Hello World ' * 100)
            f.write(b'\xFF' * 500)
            
        return path
    except Exception:
        os.unlink(path)
        raise


def test_import_succeeds():
    """Test that PayloadDetector can be imported."""
    from repository_after import PayloadDetector
    assert PayloadDetector is not None


def test_detector_initialization():
    """Test that PayloadDetector can be initialized."""
    detector = PayloadDetector("/dev/null")
    assert detector is not None
    assert detector.file_path == "/dev/null"


def test_entropy_calculation():
    """Test entropy calculation."""
    detector = PayloadDetector("/dev/null")
    
    # Low entropy (all same bytes)
    low_entropy_data = b'\x00' * 100
    entropy_low = detector.calculate_entropy(low_entropy_data)
    assert entropy_low < 1.0, "Low entropy data should have entropy < 1.0"
    
    # High entropy (random-like bytes)
    high_entropy_data = bytes([i % 256 for i in range(256)])
    entropy_high = detector.calculate_entropy(high_entropy_data)
    assert entropy_high > 7.0, "High entropy data should have entropy > 7.0"


def test_nop_sled_detection():
    """Test NOP sled detection."""
    detector = PayloadDetector("/dev/null")
    
    # Test with NOP sled
    data_with_nop = b'\x00' * 10 + b'\x90' * 20 + b'\x00' * 10
    nop_length = detector.detect_nop_sled(data_with_nop, 10)
    assert nop_length is not None, "Should detect NOP sled"
    assert nop_length >= 16, "NOP sled should be at least 16 bytes"
    
    # Test without NOP sled
    data_without_nop = b'\x00' * 100
    nop_length = detector.detect_nop_sled(data_without_nop, 0)
    assert nop_length is None, "Should not detect NOP sled in normal data"


def test_xor_pattern_detection():
    """Test XOR pattern detection."""
    detector = PayloadDetector("/dev/null")
    
    # Test with XOR pattern
    data_with_xor = b'\x00' * 10 + b'\x31\xc9\x41\xE2' + b'\x00' * 10
    has_xor = detector.detect_xor_patterns(data_with_xor, 0)
    assert has_xor, "Should detect XOR pattern"
    
    # Test without XOR pattern
    data_without_xor = b'\x00' * 100
    has_xor = detector.detect_xor_patterns(data_without_xor, 0)
    assert not has_xor, "Should not detect XOR pattern in normal data"


def test_detection_with_shellcode():
    """Test detection on file with shellcode."""
    test_file = create_test_file_with_shellcode()
    
    try:
        detector = PayloadDetector(test_file)
        detections = detector.detect()
        
        assert len(detections) > 0, "Should detect shellcode in test file"
        
        # Check that detections have correct format
        for offset, confidence, reason in detections:
            assert isinstance(offset, int), "Offset should be integer"
            assert 0.0 <= confidence <= 1.0, "Confidence should be between 0 and 1"
            assert isinstance(reason, str), "Reason should be string"
            assert len(reason) > 0, "Reason should not be empty"
            
    finally:
        os.unlink(test_file)


def test_detection_without_shellcode():
    """Test detection on file without shellcode."""
    test_file = create_test_file_without_shellcode()
    
    try:
        detector = PayloadDetector(test_file)
        detections = detector.detect()
        
        # May or may not detect, but should not crash
        assert isinstance(detections, list), "Should return list of detections"
        
    finally:
        os.unlink(test_file)


def test_chunk_reading():
    """Test that file is read in chunks."""
    test_file = create_test_file_with_shellcode()
    
    try:
        detector = PayloadDetector(test_file)
        chunks = list(detector.read_file_chunks())
        
        assert len(chunks) > 0, "Should read at least one chunk"
        
        # Check chunk sizes
        for chunk_data, offset in chunks:
            assert isinstance(chunk_data, bytes), "Chunk should be bytes"
            assert isinstance(offset, int), "Offset should be integer"
            assert len(chunk_data) <= detector.CHUNK_SIZE + detector.OVERLAP_SIZE, \
                "Chunk size should not exceed CHUNK_SIZE + OVERLAP_SIZE"
            
    finally:
        os.unlink(test_file)


def test_output_formatting():
    """Test output formatting."""
    detector = PayloadDetector("/dev/null")
    
    detections = [
        (0x1000, 0.85, "high_entropy+nop_sled_32bytes"),
        (0x2000, 0.75, "high_entropy+xor_decryption_pattern"),
    ]
    
    output = detector.format_output(detections)
    assert "0x00001000" in output, "Should contain hex offset"
    assert "0.85" in output, "Should contain confidence score"
    assert "high_entropy" in output, "Should contain reason"


def test_little_endian_requirement():
    """Test that the implementation uses Little-Endian unpacking where needed."""
    # This test ensures the code is aware of endianness requirements
    # The actual implementation should use struct.unpack('<', ...) for x64 Linux
    detector = PayloadDetector("/dev/null")
    
    # Verify struct module is used (indirectly through imports)
    import repository_after
    assert hasattr(repository_after, 'struct'), "Should import struct module"


def test_no_external_libraries():
    """Test that no forbidden libraries are used."""
    import repository_after
    import inspect
    
    # Get all imports
    source = inspect.getsource(repository_after)
    
    # Check for forbidden libraries
    forbidden = ['yara', 'volatility', 'pefile', 'capstone']
    for lib in forbidden:
        assert lib not in source.lower(), f"Should not use {lib} library"


def test_empty_file():
    """Test handling of empty files."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        # Create empty file
        with os.fdopen(fd, 'wb'):
            pass
        
        detector = PayloadDetector(path)
        detections = detector.detect()
        
        assert isinstance(detections, list), "Should return list"
        assert len(detections) == 0, "Empty file should have no detections"
        
    finally:
        os.unlink(path)


def test_very_small_file():
    """Test handling of files smaller than window size."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write only 100 bytes (smaller than WINDOW_SIZE=512)
            f.write(b'\x00' * 100)
        
        detector = PayloadDetector(path)
        detections = detector.detect()
        
        assert isinstance(detections, list), "Should return list"
        # Small files may or may not have detections, but shouldn't crash
        
    finally:
        os.unlink(path)


def test_pattern_at_chunk_boundary():
    """Test detection of patterns split across chunk boundaries."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write data up to near 4KB boundary
            f.write(b'\x00' * 4090)
            
            # Write NOP sled that spans boundary
            f.write(b'\x90' * 32)
            
            # Write high entropy data after boundary
            high_entropy = bytes([(i * 17 + 13) % 256 for i in range(512)])
            f.write(high_entropy)
            
            # Write XOR pattern
            f.write(b'\x31\xc9\x41\xE2')
        
        detector = PayloadDetector(path)
        detections = detector.detect()
        
        # Should detect pattern even though it spans chunk boundary
        assert len(detections) > 0, "Should detect pattern at chunk boundary"
        
    finally:
        os.unlink(path)


def test_high_entropy_only_no_detection():
    """Test that high entropy alone (without NOP/XOR) doesn't trigger detection."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write only high entropy data (no NOP sled, no XOR)
            high_entropy = bytes([(i * 17 + 13) % 256 for i in range(1024)])
            f.write(high_entropy)
        
        detector = PayloadDetector(path)
        detections = detector.detect()
        
        # Should NOT detect (requires high entropy + NOP/XOR)
        # Confidence threshold is 0.7, high entropy alone gives 0.4
        assert len(detections) == 0, "High entropy alone should not trigger detection"
        
    finally:
        os.unlink(path)


def test_nop_sled_only_no_detection():
    """Test that NOP sled alone (without high entropy) doesn't trigger detection."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write only NOP sled (no high entropy)
            f.write(b'\x90' * 32)
            f.write(b'\x00' * 1000)  # Low entropy data
        
        detector = PayloadDetector(path)
        detections = detector.detect()
        
        # Should NOT detect (requires high entropy + NOP/XOR)
        # NOP sled alone gives 0.3, not enough
        assert len(detections) == 0, "NOP sled alone should not trigger detection"
        
    finally:
        os.unlink(path)


def test_xor_only_no_detection():
    """Test that XOR pattern alone (without high entropy) doesn't trigger detection."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write XOR pattern in low entropy data
            f.write(b'\x00' * 100)
            f.write(b'\x31\xc9\x41\xE2')
            f.write(b'\x00' * 100)
        
        detector = PayloadDetector(path)
        detections = detector.detect()
        
        # Should NOT detect (requires high entropy + NOP/XOR)
        # XOR alone gives 0.3, not enough
        assert len(detections) == 0, "XOR pattern alone should not trigger detection"
        
    finally:
        os.unlink(path)


def test_requires_combined_indicators():
    """Test that detection requires High Entropy + at least one other indicator."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write NOP sled + high entropy (should detect)
            f.write(b'\x90' * 32)
            high_entropy = bytes([(i * 17 + 13) % 256 for i in range(512)])
            f.write(high_entropy)
        
        detector = PayloadDetector(path)
        detections = detector.detect()
        
        # Should detect (high entropy 0.4 + NOP 0.3 = 0.7 >= threshold)
        assert len(detections) > 0, "High entropy + NOP sled should trigger detection"
        
        # Verify confidence is >= 0.7
        for offset, confidence, reason in detections:
            assert confidence >= 0.7, f"Confidence should be >= 0.7, got {confidence}"
            assert "high_entropy" in reason, "Reason should include high_entropy"
        
    finally:
        os.unlink(path)


def test_confidence_score_range():
    """Test that confidence scores are in valid range."""
    test_file = create_test_file_with_shellcode()
    
    try:
        detector = PayloadDetector(test_file)
        detections = detector.detect()
        
        for offset, confidence, reason in detections:
            assert 0.0 <= confidence <= 1.0, f"Confidence {confidence} should be between 0 and 1"
            assert confidence >= 0.7, "Only detections with confidence >= 0.7 should be returned"
            
    finally:
        os.unlink(test_file)


def test_hex_offset_format():
    """Test that output uses correct hex offset format."""
    detector = PayloadDetector("/dev/null")
    
    detections = [
        (0x1000, 0.85, "high_entropy+nop_sled_32bytes"),
        (0xABCDEF, 0.75, "high_entropy+xor_decryption_pattern"),
    ]
    
    output = detector.format_output(detections)
    
    # Check hex format (0x followed by 8 hex digits)
    assert "0x00001000" in output, "Should format offset as 0x00001000"
    assert "0x00ABCDEF" in output, "Should format offset as 0x00ABCDEF"


def test_file_not_found():
    """Test handling of non-existent file."""
    detector = PayloadDetector("/nonexistent/file/that/does/not/exist.bin")
    
    # Should raise IOError or exit with error
    with pytest.raises((IOError, SystemExit)):
        detector.detect()


def test_nop_sled_selection_uses_longer():
    """Test that when both NOP sleds are found (before and after), the longer one is used."""
    fd, path = tempfile.mkstemp(suffix='.bin')
    
    try:
        with os.fdopen(fd, 'wb') as f:
            # Write shorter NOP sled before (20 bytes)
            f.write(b'\x90' * 20)
            
            # Write high entropy data
            high_entropy = bytes([(i * 17 + 13) % 256 for i in range(512)])
            f.write(high_entropy)
            
            # Write longer NOP sled after (32 bytes)
            f.write(b'\x90' * 32)
        
        detector = PayloadDetector(path)
        detections = detector.detect()
        
        # Should detect and use the longer NOP sled (32 bytes)
        assert len(detections) > 0, "Should detect shellcode"
        
        # Check that the longer NOP sled is used in the reason
        for offset, confidence, reason in detections:
            # Should contain nop_sled_32bytes, not nop_sled_20bytes
            if 'nop_sled' in reason:
                assert 'nop_sled_32bytes' in reason or int(reason.split('nop_sled_')[1].split('bytes')[0]) >= 32, \
                    f"Should use longer NOP sled (32 bytes), got: {reason}"
        
    finally:
        os.unlink(path)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
