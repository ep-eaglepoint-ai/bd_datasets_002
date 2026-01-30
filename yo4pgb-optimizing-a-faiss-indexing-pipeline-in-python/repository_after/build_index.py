#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import faiss
import numpy as np
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer


class Settings(BaseModel):
    embedding_model_name: str = os.getenv(
        "EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2"
    )
    llm_base_model: str = os.getenv("LLM_BASE_MODEL", "mistralai/Mistral-7B-v0.1")
    max_chunk_tokens: int = int(os.getenv("MAX_CHUNK_TOKENS", 500))
    chunk_overlap_tokens: int = int(os.getenv("CHUNK_OVERLAP_TOKENS", 50))


settings = Settings()


def _stringify(x: Any) -> str:
    """Safely convert any input to a clean string without carriage returns."""
    if isinstance(x, str):
        return x.replace("\r\n", "\n").replace("\r", "\n")
    try:
        s = str(x)
    except Exception:
        s = repr(x)
    return s.replace("\r\n", "\n").replace("\r", "\n")


def _ensure_parent_dir(path: str) -> None:
    """Ensure the parent directory of the given path exists."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)


def _validate_record(rec: Dict[str, Any], line_no: int) -> None:
    """
    Validate that the record contains the required 'text' field.
    
    Args:
        rec: The record dictionary to validate.
        line_no: The line number in the source file for error reporting.
        
    Raises:
        ValueError: If the record is None or missing the 'text' key.
    """
    if rec is None:
        raise ValueError(f"Line {line_no} could not be parsed (None).")

    if "text" not in rec:
        available = ", ".join(sorted(map(str, rec.keys())))
        raise ValueError(f"Line {line_no} is missing required key 'text'. Keys: {available}")

    rec["text"] = _stringify(rec.get("text", ""))


def _extract_text(rec: Dict[str, Any]) -> str:
    """Extract and clean text from the record."""
    t = rec.get("text", "")
    if not isinstance(t, str):
        t = _stringify(t)
    return " ".join(t.split()).replace("\t", "    ")


class Embedder:
    """
    Handles text embedding using SentenceTransformers.
    Optimized to use batch processing for efficiency.
    """
    def __init__(self, model_name: str):
        if os.getenv("EMBEDDING_MODEL_NAME") is not None:
            model_name = os.getenv("EMBEDDING_MODEL_NAME", model_name)
        self.model = SentenceTransformer(model_name)

    def encode(self, texts: List[str]) -> List[List[float]]:
        """
        Encode a list of texts into embeddings.
        
        Args:
            texts: List of strings to encode.
            
        Returns:
            List of embedding vectors (lists of floats).
        """
        if not texts:
            return []
        # Batch encode is significantly faster
        return self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)


def _parse_json_multiple_times(line: str) -> Dict[str, Any]:
    """
    Mock of the redundant parsing for test compatibility.
    (Restored for unit test compatibility in test_unit.py)
    """
    return json.loads(line)


def _build_records_and_texts(input_path: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Read the input JSONL file and build lists of records and cleaned texts.
    Optimized to minimize file reading and iteration overhead.
    """
    records: List[Dict[str, Any]] = []
    texts: List[str] = []
    
    with open(input_path, "r", encoding="utf-8") as fh:
        for idx, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue

            _validate_record(rec, idx)
            records.append(rec)
            texts.append(_extract_text(rec))

    return records, texts


def _embeddings_to_numpy(embs: List[List[float]], expected_rows: int) -> np.ndarray:
    """Convert a list of embeddings to a float32 numpy array."""
    as_array = np.array(embs, dtype="float32")

    if as_array.ndim != 2:
        raise RuntimeError(f"Unexpected embedding ndim={as_array.ndim}")
    if as_array.shape[0] != expected_rows:
        raise RuntimeError(f"Row mismatch: {as_array.shape[0]} vs {expected_rows}")

    return as_array


def _write_metadata(store_path: str, records: List[Dict[str, Any]]) -> None:
    """Write metadata records to a JSONL file."""
    with open(store_path, "w", encoding="utf-8") as out:
        for rec in records:
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")


def _build_faiss_index(embs_np: np.ndarray) -> faiss.Index:
    """Build a FAISS IndexFlatIP from the embeddings numpy array."""
    dim = int(embs_np.shape[1])
    index = faiss.IndexFlatIP(dim)
    # Use batch add instead of loop
    index.add(embs_np)
    return index


def _print_summary(n: int, index_path: str, store_path: str, model: str, dim: int) -> None:
    """Print a summary of the indexing process."""
    msg = [
        f"✅ Indexed {n} chunks",
        f"   FAISS index: {index_path}",
        f"   Metadata:    {store_path}",
        f"   Model:       {model}",
        f"   Dim:         {dim}"
    ]
    sys.stdout.write("\n".join(msg) + "\n")
    sys.stdout.flush()


def main() -> None:
    ap = argparse.ArgumentParser(description="Build a FAISS index from a JSONL of chunks.")
    ap.add_argument("--input", required=True)
    ap.add_argument("--index", required=True)
    ap.add_argument("--store", required=True)
    ap.add_argument("--model", default=settings.embedding_model_name)
    args = ap.parse_args()

    _ensure_parent_dir(args.index)
    _ensure_parent_dir(args.store)

    records, texts = _build_records_and_texts(args.input)

    if not records:
        raise ValueError("No valid records found in input JSONL.")

    embedder = Embedder(args.model)
    embs_np = _embeddings_to_numpy(embedder.encode(texts), expected_rows=len(records))
    index = _build_faiss_index(embs_np)

    faiss.write_index(index, args.index)
    _write_metadata(args.store, records)

    dim = int(embs_np.shape[1])
    _print_summary(len(records), args.index, args.store, args.model, dim)


if __name__ == "__main__":
    main()
