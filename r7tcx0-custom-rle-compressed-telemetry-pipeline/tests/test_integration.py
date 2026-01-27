import pytest
import asyncio
import aiohttp
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'repository_after'))

from server import create_app


class TestIntegration:
    @pytest.fixture
    def app(self):
        return create_app()
    
    @pytest.fixture
    async def server(self, app):
        runner = aiohttp.web.AppRunner(app)
        await runner.setup()
        
        site = aiohttp.web.TCPSite(runner, '127.0.0.1', 8765)
        await site.start()
        
        yield 'http://127.0.0.1:8765'
        
        await runner.cleanup()
    
    async def test_serve_html(self, server):
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{server}/') as resp:
                assert resp.status == 200
                assert resp.content_type == 'text/html'
                html = await resp.text()
                assert 'RLE Telemetry Pipeline' in html
                assert 'compressRLE' in html
    
    async def test_process_valid_compressed_data(self, server):
        # Valid RLE: 100 elements of value 50, 255 elements of value 25, 245 elements of value 25
        # Total: 100 + 255 + 245 = 600 elements (will be rejected for wrong size, but RLE is valid)
        compressed_data = bytes([100, 50, 255, 25, 245, 25])
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{server}/process',
                data=compressed_data,
                headers={'Content-Type': 'application/octet-stream'}
            ) as resp:
                assert resp.status == 400
                error_text = await resp.text()
                assert 'Expected 10,000 elements' in error_text
    
    async def test_process_empty_request(self, server):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{server}/process',
                data=b'',
                headers={'Content-Type': 'application/octet-stream'}
            ) as resp:
                assert resp.status == 400
                error_text = await resp.text()
                assert 'Empty request body' in error_text
    
    async def test_process_invalid_rle_stream(self, server):
        invalid_data = bytes([5, 10, 3])
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{server}/process',
                data=invalid_data,
                headers={'Content-Type': 'application/octet-stream'}
            ) as resp:
                assert resp.status == 400
                error_text = await resp.text()
                assert 'Invalid RLE stream' in error_text
    
    async def test_process_wrong_element_count(self, server):
        compressed_data = bytes([50, 25])
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{server}/process',
                data=compressed_data,
                headers={'Content-Type': 'application/octet-stream'}
            ) as resp:
                assert resp.status == 400
                error_text = await resp.text()
                assert 'Expected 10,000 elements' in error_text
    
    async def test_process_complex_matrix(self, server):
        # Create a valid 10,000 element matrix using proper RLE
        # 39 runs of 255 elements = 9,945 elements + 55 elements = 10,000 total
        compressed_data = bytes([255, 128] * 39 + [55, 128])
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{server}/process',
                data=compressed_data,
                headers={'Content-Type': 'application/octet-stream'}
            ) as resp:
                assert resp.status == 200
                result = await resp.json()
                assert 'average' in result
                assert abs(result['average'] - 128.0) < 0.001
    
    async def test_process_random_matrix(self, server):
        import random
        random.seed(42)
        
        matrix = [random.randint(0, 255) for _ in range(10000)]
        compressed = []
        i = 0
        while i < len(matrix):
            current = matrix[i]
            count = 1
            while i + count < len(matrix) and matrix[i + count] == current and count < 255:
                count += 1
            compressed.extend([count, current])
            i += count
        
        compressed_data = bytes(compressed)
        expected_average = sum(matrix) / len(matrix)
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{server}/process',
                data=compressed_data,
                headers={'Content-Type': 'application/octet-stream'}
            ) as resp:
                assert resp.status == 200
                result = await resp.json()
                assert 'average' in result
                assert abs(result['average'] - expected_average) < 0.001
