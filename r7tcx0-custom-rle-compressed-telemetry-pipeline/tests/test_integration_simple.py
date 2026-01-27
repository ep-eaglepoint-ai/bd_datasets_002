import pytest
import asyncio
import aiohttp
import sys
import os
from aiohttp import web

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from server import TelemetryProcessor


@pytest.mark.asyncio
async def test_telemetry_processor_valid():
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
    
    result = await processor.process_telemetry(compressed_bytes)
    
    assert 'average' in result
    assert 0 <= result['average'] <= 255


@pytest.mark.asyncio
async def test_telemetry_processor_wrong_element_count():
    processor = TelemetryProcessor()
    
    compressed = bytes([50, 25])  # Valid RLE but wrong size (50 elements, not 10,000)
    
    with pytest.raises(web.HTTPBadRequest):
        await processor.process_telemetry(compressed)


@pytest.mark.asyncio
async def test_telemetry_processor_empty():
    processor = TelemetryProcessor()
    
    compressed = bytes([])
    
    with pytest.raises(web.HTTPBadRequest):
        await processor.process_telemetry(compressed)


@pytest.mark.asyncio
async def test_js_python_binary_compatibility():
    """Test that simulates JS Uint8Array → HTTP → Python bytes flow.
    
    This test mimics exactly how the frontend would send binary data:
    - Creates raw bytes as they would appear from JS Uint8Array
    - Tests the complete binary pipeline without Python list conversion
    """
    processor = TelemetryProcessor()
    
    # Simulate JS-generated binary: 39 runs of 255 elements + 55 elements = 10,000 total
    # This is exactly what JS would send: Uint8Array → ArrayBuffer → HTTP body
    js_binary_data = bytes([255, 128] * 39 + [55, 128])
    
    result = await processor.process_telemetry(js_binary_data)
    
    assert 'average' in result
    assert abs(result['average'] - 128.0) < 0.001
