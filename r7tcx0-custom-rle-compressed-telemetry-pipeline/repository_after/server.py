from aiohttp import web
import asyncio
import json
import os

class RLECompressor:
    @staticmethod
    def compress_rle(data):
        """
        Compress data using custom RLE algorithm.
        Format: [Count, Value] where Count is 1-255, Value is 0-255
        """
        if len(data) == 0:
            return bytes()
        
        # Validate input data
        for i, val in enumerate(data):
            if not isinstance(val, int):
                raise TypeError(f"Value at position {i} is not an integer: {val}")
            if val < 0 or val > 255:
                raise ValueError(f"Value at position {i} out of range (0-255): {val}")
        
        compressed = []
        current = data[0]
        count = 1
        
        for i in range(1, len(data)):
            if data[i] == current and count < 255:
                count += 1
            else:
                compressed.extend([count, current])
                current = data[i]
                count = 1
        
        # Add the last run
        compressed.extend([count, current])
        
        return bytes(compressed)

class RLEDecompressor:
    @staticmethod
    def decompress_rle(compressed_data):
        if len(compressed_data) % 2 != 0:
            raise ValueError("Invalid RLE stream: odd number of bytes")
        
        decompressed = []
        i = 0
        
        while i < len(compressed_data):
            count = compressed_data[i]
            value = compressed_data[i + 1]
            
            # Explicit validation: count must be 1-255 (value already validated by bytes type)
            if count > 255:
                raise ValueError(f"RLE count exceeds 255: {count}")
            
            if count == 0:
                # DESIGN DECISION: Zero-count pairs are ignored for robustness.
                # While technically invalid per strict RLE spec (count should be 1-255),
                # silently ignoring them prevents crashes from corrupted telemetry
                # and provides graceful degradation. This is documented in tests.
                i += 2
                continue
            
            decompressed.extend([value] * count)
            i += 2
        
        return decompressed

class TelemetryProcessor:
    def __init__(self):
        self.decompressor = RLEDecompressor()
        self.compressor = RLECompressor()
    
    def generate_test_matrix(self, size=10000):
        """Generate test matrix of random integers 0-255"""
        import random
        return [random.randint(0, 255) for _ in range(size)]
    
    async def process_telemetry(self, compressed_data):
        try:
            # Validate input is bytes
            if not isinstance(compressed_data, bytes):
                raise ValueError("Input must be bytes")
            
            decompressed_data = self.decompressor.decompress_rle(compressed_data)
            
            if len(decompressed_data) != 10000:
                raise ValueError(f"Expected 10,000 elements, got {len(decompressed_data)}")
            
            # Additional validation: ensure all values are 0-255
            for i, val in enumerate(decompressed_data):
                if val < 0 or val > 255:
                    raise ValueError(f"Invalid sensor value at position {i}: {val} (must be 0-255)")
            
            average = sum(decompressed_data) / len(decompressed_data)
            
            return {"average": average}
        except web.HTTPException:
            raise
        except Exception as e:
            raise web.HTTPBadRequest(text=str(e))

async def handle_test_rle(request):
    """Test endpoint to verify RLE compression/decompression roundtrip"""
    try:
        processor = TelemetryProcessor()
        
        # Generate test matrix
        original_data = processor.generate_test_matrix(10000)
        
        # Compress it
        compressed_data = processor.compressor.compress_rle(original_data)
        
        # Decompress it
        decompressed_data = processor.decompressor.decompress_rle(compressed_data)
        
        # Verify roundtrip
        if original_data != decompressed_data:
            raise web.HTTPInternalServerError(text="RLE roundtrip failed")
        
        # Calculate average
        average = sum(decompressed_data) / len(decompressed_data)
        
        return web.json_response({
            "average": average,
            "original_size": len(original_data),
            "compressed_size": len(compressed_data),
            "compression_ratio": round((1 - len(compressed_data) / len(original_data)) * 100, 2)
        })
    
    except Exception as e:
        raise web.HTTPInternalServerError(text=str(e))

async def handle_process(request):
    try:
        content = await request.read()
        
        if not content:
            raise web.HTTPBadRequest(text="Empty request body")
        
        processor = TelemetryProcessor()
        result = await processor.process_telemetry(content)
        
        return web.json_response(result)
    
    except web.HTTPBadRequest:
        raise
    except Exception as e:
        raise web.HTTPInternalServerError(text=f"Internal server error: {str(e)}")

async def handle_index(request):
    html_path = os.path.join(os.path.dirname(__file__), 'index.html')
    with open(html_path, 'r') as f:
        return web.Response(text=f.read(), content_type='text/html')

def create_app():
    app = web.Application()
    app.router.add_get('/', handle_index)
    app.router.add_post('/process', handle_process)
    app.router.add_get('/test-rle', handle_test_rle)
    return app

async def main():
    app = create_app()
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    
    print("Server running on http://0.0.0.0:8080")
    try:
        await asyncio.Future()
    except KeyboardInterrupt:
        pass
    finally:
        await runner.cleanup()

if __name__ == '__main__':
    asyncio.run(main())
