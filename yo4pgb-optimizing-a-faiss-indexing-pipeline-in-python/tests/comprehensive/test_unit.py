import pytest
import os
import json
import numpy as np
import faiss
from build_index import (
    _stringify,
    _parse_json_multiple_times,
    _validate_record,
    _extract_text,
    _embeddings_to_numpy
)

def test_stringify():
    assert _stringify("test") == "test"
    assert _stringify(123) == "123"
    assert _stringify("a\r\nb") == "a\nb"

def test_parse_json():
    line = '{"text": "hello", "id": 1}'
    res = _parse_json_multiple_times(line)
    assert res == {"text": "hello", "id": 1}

def test_validate_record():
    rec = {"text": "valid"}
    _validate_record(rec, 1) # Should not raise
    
    with pytest.raises(ValueError, match="missing required key 'text'"):
        _validate_record({"id": 1}, 1)

def test_extract_text():
    rec = {"text": "  hello \t world  "}
    # The slow version does: " ".join(t.split(" ")).replace("\t", "    ")
    # "  hello \t world  ".split(" ") -> ['', '', 'hello', '\t', 'world', '', '']
    # " ".join(...) -> "  hello \t world  "
    # replace(...) -> "  hello     world  "
    res = _extract_text(rec)
    assert "hello" in res
    assert "world" in res

def test_embeddings_to_numpy():
    embs = [[1.0, 2.0], [3.0, 4.0]]
    arr = _embeddings_to_numpy(embs, 2)
    assert arr.shape == (2, 2)
    assert arr.dtype == np.float32
    assert np.allclose(arr, np.array(embs, dtype=np.float32))

def test_embeddings_to_numpy_mismatch():
    embs = [[1.0, 2.0]]
    with pytest.raises(RuntimeError, match="Row mismatch"):
        _embeddings_to_numpy(embs, 2)
