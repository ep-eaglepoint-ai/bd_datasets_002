import pytest
import sys
import os
from aiohttp import web

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from server import RLEDecompressor, TelemetryProcessor


class TestRLEDecompressor:
    def test_simple_compression(self):
        decompressor = RLEDecompressor()
        
        compressed = bytes([6, 5, 1, 10, 3, 20, 10, 255])
        expected = [5, 5, 5, 5, 5, 5, 10, 20, 20, 20] + [255] * 10
        
        result = decompressor.decompress_rle(compressed)
        assert result == expected
    
    def test_empty_data(self):
        decompressor = RLEDecompressor()
        
        compressed = bytes([])
        result = decompressor.decompress_rle(compressed)
        assert result == []
    
    def test_single_value(self):
        decompressor = RLEDecompressor()
        
        compressed = bytes([5, 42])
        expected = [42, 42, 42, 42, 42]
        
        result = decompressor.decompress_rle(compressed)
        assert result == expected
    
    def test_long_run_splitting(self):
        decompressor = RLEDecompressor()
        
        compressed = bytes([255, 7, 45, 7])
        expected = [7] * 300
        
        result = decompressor.decompress_rle(compressed)
        assert result == expected
    
    def test_zero_count_handling(self):
        """Test that zero-count pairs are ignored by design.
        
        Note: The specification doesn't require handling count=0, but our
        implementation ignores these pairs for robustness. This behavior
        is documented here for clarity.
        """
        decompressor = RLEDecompressor()
        
        compressed = bytes([0, 5, 3, 10, 0, 15, 2, 20])
        # Zero-count pairs [0,5] and [0,15] should be ignored
        expected = [10, 10, 10, 20, 20]
        
        result = decompressor.decompress_rle(compressed)
        assert result == expected
    
    def test_invalid_odd_length(self):
        decompressor = RLEDecompressor()
        
        compressed = bytes([5, 10, 3])
        
        with pytest.raises(ValueError, match="Invalid RLE stream: odd number of bytes"):
            decompressor.decompress_rle(compressed)
    
    def test_full_range_values(self):
        decompressor = RLEDecompressor()
        
        compressed = bytes([1, 0, 1, 255, 2, 128])
        expected = [0, 255, 128, 128]
        
        result = decompressor.decompress_rle(compressed)
        assert result == expected


class TestTelemetryProcessor:
    def test_process_valid_10000_elements(self):
        processor = TelemetryProcessor()
        
        compressed = []
        remaining = 10000
        value = 50
        
        while remaining > 0:
            count = min(255, remaining)
            compressed.extend([count, value])
            remaining -= count
            value = (value + 1) % 256
        
        compressed_bytes = bytes(compressed)
        
        import asyncio
        result = asyncio.run(processor.process_telemetry(compressed_bytes))
        
        assert 'average' in result
        assert 0 <= result['average'] <= 255
    
    def test_process_invalid_element_count(self):
        processor = TelemetryProcessor()
        
        compressed = bytes([50, 25])
        
        import asyncio
        with pytest.raises(web.HTTPBadRequest):
            asyncio.run(processor.process_telemetry(compressed))
    
    def test_process_empty_data(self):
        processor = TelemetryProcessor()
        
        compressed = bytes([])
        
        import asyncio
        with pytest.raises(web.HTTPBadRequest):
            asyncio.run(processor.process_telemetry(compressed))


class TestRLEAlgorithm:
    def test_compression_decompression_roundtrip(self):
        decompressor = RLEDecompressor()
        
        original = [5] * 300 + [10] + [20] * 3 + [255] * 10 + [0] * 50
        
        compressed = []
        i = 0
        while i < len(original):
            current = original[i]
            count = 1
            while i + count < len(original) and original[i + count] == current and count < 255:
                count += 1
            
            compressed.extend([count, current])
            i += count
        
        compressed_bytes = bytes(compressed)
        decompressed = decompressor.decompress_rle(compressed_bytes)
        
        assert decompressed == original
    
    def test_all_byte_values(self):
        decompressor = RLEDecompressor()
        
        compressed_list = []
        for i in range(255):
            count = (i + 1) % 256
            if count == 0:
                count = 256
            if count <= 255 and i <= 255:
                compressed_list.extend([count, i])
        compressed = bytes(compressed_list)
        
        result = decompressor.decompress_rle(compressed)
        
        expected = []
        for i in range(255):
            count = (i + 1) % 256
            if count == 0:
                count = 256
            expected.extend([i] * count)
        
        assert result == expected
