"""
File reading module for chunked streaming of binary files.
"""

import sys
from typing import Generator, Tuple
from .config import CHUNK_SIZE, OVERLAP_SIZE


def read_file_chunks(file_path: str) -> Generator[Tuple[bytes, int], None, None]:
    """
    Read file in chunks with overlap to catch payloads across boundaries.
    
    Args:
        file_path: Path to the file to read
        
    Yields:
        Tuple of (chunk_data, global_offset)
    """
    try:
        with open(file_path, 'rb') as f:
            global_offset = 0
            previous_chunk_tail = b''
            
            while True:
                chunk = f.read(CHUNK_SIZE)
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
                if len(chunk) >= OVERLAP_SIZE:
                    previous_chunk_tail = chunk[-OVERLAP_SIZE:]
                else:
                    # Chunk smaller than overlap - combine with previous tail
                    previous_chunk_tail = (previous_chunk_tail + chunk)[-OVERLAP_SIZE:]
                
                global_offset += len(chunk)
                
    except IOError as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)
