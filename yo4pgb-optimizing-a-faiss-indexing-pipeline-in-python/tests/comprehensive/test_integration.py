import pytest
import os
import json
import tempfile
import numpy as np
import faiss
from build_index import main
import argparse
from unittest.mock import patch

def test_full_pipeline_success():
    # Create mock input JSONL
    with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
        f.write(json.dumps({"text": "The quick brown fox jumps over the lazy dog."}) + "\n")
        f.write(json.dumps({"text": "Artificial intelligence is changing the world."}) + "\n")
        input_path = f.name

    with tempfile.TemporaryDirectory() as tmp_dir:
        index_path = os.path.join(tmp_dir, "index.faiss")
        store_path = os.path.join(tmp_dir, "metadata.jsonl")
        
        test_args = [
            "main.py",
            "--input", input_path,
            "--index", index_path,
            "--store", store_path,
            "--model", "sentence-transformers/all-MiniLM-L6-v2"
        ]
        
        with patch('sys.argv', test_args):
            main()
            
        assert os.path.exists(index_path)
        assert os.path.exists(store_path)
        
        # Verify index
        index = faiss.read_index(index_path)
        assert index.ntotal == 2
        assert index.d == 384 # MiniLM dimension
        
        # Verify metadata
        with open(store_path, 'r') as f:
            lines = f.readlines()
            assert len(lines) == 2
            assert json.loads(lines[0])["text"] == "The quick brown fox jumps over the lazy dog."

    os.remove(input_path)

def test_pipeline_empty_input():
    with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
        input_path = f.name
        
    with tempfile.TemporaryDirectory() as tmp_dir:
        index_path = os.path.join(tmp_dir, "index.faiss")
        store_path = os.path.join(tmp_dir, "metadata.jsonl")
        
        test_args = [
            "main.py",
            "--input", input_path,
            "--index", index_path,
            "--store", store_path
        ]
        
        with patch('sys.argv', test_args):
            with pytest.raises(ValueError, match="No valid records found in input JSONL"):
                main()
    
    os.remove(input_path)
