import pytest
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from server import RLECompressor, RLEDecompressor


class TestRLECompressor:
    def test_compress_empty_data(self):
        compressor = RLECompressor()
        result = compressor.compress_rle([])
        assert result == bytes()
    
    def test_compress_single_value(self):
        compressor = RLECompressor()
        result = compressor.compress_rle([42])
        assert result == bytes([1, 42])
    
    def test_compress_simple_run(self):
        compressor = RLECompressor()
        result = compressor.compress_rle([5, 5, 5, 5, 5])
        assert result == bytes([5, 5])
    
    def test_compress_multiple_runs(self):
        compressor = RLECompressor()
        data = [5, 5, 5, 10, 20, 20, 20, 255, 255]
        result = compressor.compress_rle(data)
        expected = bytes([3, 5, 1, 10, 3, 20, 2, 255])
        assert result == expected
    
    def test_compress_long_run_splitting(self):
        compressor = RLECompressor()
        data = [7] * 300  # 300 repetitions of 7
        result = compressor.compress_rle(data)
        expected = bytes([255, 7, 45, 7])
        assert result == expected
    
    def test_compress_max_run_boundary(self):
        compressor = RLECompressor()
        data = [9] * 255  # Exactly 255 repetitions
        result = compressor.compress_rle(data)
        expected = bytes([255, 9])
        assert result == expected
    
    def test_compress_alternating_values(self):
        compressor = RLECompressor()
        data = [1, 2, 3, 4, 5]
        result = compressor.compress_rle(data)
        expected = bytes([1, 1, 1, 2, 1, 3, 1, 4, 1, 5])
        assert result == expected


class TestRLECompressorDecompressorRoundtrip:
    def test_roundtrip_empty(self):
        compressor = RLECompressor()
        decompressor = RLEDecompressor()
        
        original = []
        compressed = compressor.compress_rle(original)
        decompressed = decompressor.decompress_rle(compressed)
        
        assert decompressed == original
    
    def test_roundtrip_single(self):
        compressor = RLECompressor()
        decompressor = RLEDecompressor()
        
        original = [42]
        compressed = compressor.compress_rle(original)
        decompressed = decompressor.decompress_rle(compressed)
        
        assert decompressed == original
    
    def test_roundtrip_complex(self):
        compressor = RLECompressor()
        decompressor = RLEDecompressor()
        
        original = [5] * 300 + [10] + [20] * 3 + [255] * 10 + [0] * 50
        compressed = compressor.compress_rle(original)
        decompressed = decompressor.decompress_rle(compressed)
        
        assert decompressed == original
    
    def test_roundtrip_full_range(self):
        compressor = RLECompressor()
        decompressor = RLEDecompressor()
        
        original = []
        for i in range(256):
            original.extend([i] * (i + 1))
        
        compressed = compressor.compress_rle(original)
        decompressed = decompressor.decompress_rle(compressed)
        
        assert decompressed == original
    
    def test_roundtrip_random_data(self):
        import random
        random.seed(42)
        
        compressor = RLECompressor()
        decompressor = RLEDecompressor()
        
        original = [random.randint(0, 255) for _ in range(1000)]
        compressed = compressor.compress_rle(original)
        decompressed = decompressor.decompress_rle(compressed)
        
        assert decompressed == original


class TestRLECompressorValidation:
    def test_compress_invalid_values_negative(self):
        compressor = RLECompressor()
        with pytest.raises(ValueError, match="out of range"):
            compressor.compress_rle([-1, 5, 10])
    
    def test_compress_invalid_values_too_large(self):
        compressor = RLECompressor()
        with pytest.raises(ValueError, match="out of range"):
            compressor.compress_rle([256, 5, 10])
    
    def test_compress_non_integer_values(self):
        compressor = RLECompressor()
        with pytest.raises(TypeError, match="not an integer"):
            compressor.compress_rle([1.5, 2.5, 3.5])
    
    def test_compress_string_values(self):
        compressor = RLECompressor()
        with pytest.raises(TypeError, match="not an integer"):
            compressor.compress_rle(['a', 'b', 'c'])
