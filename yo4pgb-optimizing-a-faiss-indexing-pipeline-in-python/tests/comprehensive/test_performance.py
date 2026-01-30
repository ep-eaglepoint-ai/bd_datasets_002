import pytest
import time
import os
import json
import tempfile
from build_index import main
from unittest.mock import patch

@pytest.mark.timeout(300)
def test_performance_large_batch():
    """
    Test that the pipeline handles a larger dataset efficiently.
    500 records:
    - Optimized version (batching) passes easily (~2s).
    - Original version (1-by-1) is too slow (failing the 10.0s assertion).
    """
    num_records = 500 
    with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
        for i in range(num_records):
            text = f"Record {i}: Moderate length text for testing performance. " * 3
            f.write(json.dumps({"text": text}) + "\n")
        input_path = f.name

    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            index_path = os.path.join(tmp_dir, "index.faiss")
            store_path = os.path.join(tmp_dir, "metadata.jsonl")
            
            test_args = [
                "main.py",
                "--input", input_path,
                "--index", index_path,
                "--store", store_path
            ]
            
            start_time = time.perf_counter()
            with patch('sys.argv', test_args):
                main()
            duration = time.perf_counter() - start_time
            
            # 10s is plenty for optimized but impossible for unoptimized (which takes ~75s)
            limit = 10.0 
            assert duration < limit, f"Pipeline too slow: {duration:.2f}s (limit: {limit}s)."
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)
