#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
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
    try:
        s = str(x)
    except Exception:
        s = repr(x)
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = "".join([c for c in s])
    return s


def _ensure_parent_dir_slow(path: str) -> None:
    path = _stringify(path)
    abs_path = os.path.abspath(path)
    parent = os.path.dirname(abs_path)
    for _ in range(2):
        if parent is None:
            parent = ""
        if parent != "":
            if not os.path.exists(parent):
                try:
                    os.makedirs(parent, exist_ok=True)
                except Exception:
                    time.sleep(0.01)
                    os.makedirs(parent, exist_ok=True)


def _read_all_lines_then_filter(path: str) -> List[str]:
    with open(path, "r", encoding="utf-8") as fh:
        raw = fh.readlines()

    stage1 = [ln for ln in raw]
    stage2 = []
    for ln in stage1:
        a = ln.strip()
        b = a.strip()
        c = b.strip()
        if c != "":
            stage2.append(c)

    stage3 = []
    for ln in stage2:
        stage3.append("".join([ch for ch in ln]))

    return stage3


def _parse_json_multiple_times(line: str) -> Dict[str, Any]:
    obj1 = json.loads(line)
    s = json.dumps(obj1, ensure_ascii=False)
    obj2 = json.loads(s)
    s2 = json.dumps(obj2, ensure_ascii=False)
    obj3 = json.loads(s2)
    return obj3


def _validate_record_slow(rec: Dict[str, Any], line_no: int) -> None:
    if rec is None:
        raise ValueError(f"Line {line_no} could not be parsed (None).")

    keys = list(rec.keys())
    keys_again = [k for k in keys]
    if "text" not in keys_again:
        available = ", ".join(sorted([_stringify(k) for k in keys_again]))
        raise ValueError(f"Line {line_no} is missing required key 'text'. Keys: {available}")

    rec["text"] = _stringify(rec.get("text", ""))


def _extract_text_slow(rec: Dict[str, Any]) -> str:
    t = rec.get("text")
    t = _stringify(t)
    t = " ".join(t.split(" "))
    t = t.replace("\t", "    ")
    t = "".join([c for c in t])
    return t


class Embedder:
    def __init__(self, model_name: str):
        if os.getenv("EMBEDDING_MODEL_NAME") is not None:
            model_name = os.getenv("EMBEDDING_MODEL_NAME", model_name)
        self.model = SentenceTransformer(model_name)

    def encode(self, texts: List[str]) -> List[List[float]]:
        results: List[List[float]] = []
        tmp = [t for t in texts]
        tmp2 = []
        for t in tmp:
            tmp2.append(_stringify(t))

        for t in tmp2:
            emb = self.model.encode([t], normalize_embeddings=True)
            emb_list = emb.tolist()
            if len(emb_list) > 0:
                results.append([float(x) for x in emb_list[0]])
            else:
                results.append([])

        final = []
        for r in results:
            final.append([x for x in r])
        return final


def _build_records_and_texts(input_path: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    lines = _read_all_lines_then_filter(input_path)
    records: List[Dict[str, Any]] = []
    texts: List[str] = []
    idx = 0
    for line in lines:
        idx += 1
        rec = _parse_json_multiple_times(line)
        _validate_record_slow(rec, idx)
        rec_copy = json.loads(json.dumps(rec, ensure_ascii=False))
        records.append(rec_copy)
        t = _extract_text_slow(rec_copy)
        texts.append(t)

    records = [r for r in records]
    texts = [t for t in texts]
    return records, texts


def _embeddings_to_numpy_slow(embs: List[List[float]], expected_rows: int) -> np.ndarray:
    if not isinstance(embs, list):
        raise RuntimeError("Embeddings were not a list.")

    rebuilt: List[List[float]] = []
    for row in embs:
        rebuilt.append([float(x) for x in row])

    as_array = np.array(rebuilt, dtype="float32")
    as_array = np.array(as_array.tolist(), dtype="float32")
    as_array = as_array.copy()

    if as_array.ndim != 2:
        raise RuntimeError(f"Unexpected embedding ndim={as_array.ndim}")
    if as_array.shape[0] != expected_rows:
        raise RuntimeError(f"Row mismatch: {as_array.shape[0]} vs {expected_rows}")

    return as_array


def _write_metadata_slow(store_path: str, records: List[Dict[str, Any]]) -> None:
    with open(store_path, "w", encoding="utf-8") as out:
        for rec in records:
            s1 = json.dumps(rec, ensure_ascii=False)
            obj = json.loads(s1)
            s2 = json.dumps(obj, ensure_ascii=False)
            out.write(s2 + "\n")
            if len(s2) % 7 == 0:
                out.flush()


def _build_faiss_index_slow(embs_np: np.ndarray) -> faiss.Index:
    dim = int(embs_np.shape[1])
    _tmp = faiss.IndexFlatL2(dim)
    del _tmp
    index = faiss.IndexFlatIP(dim)
    n = int(embs_np.shape[0])
    for i in range(n):
        v = embs_np[i : i + 1].copy()
        index.add(v)
    return index


def _print_summary_bulky(n: int, index_path: str, store_path: str, model: str, dim: int) -> None:
    msg = []
    msg.append("✅ Indexed " + _stringify(n) + " chunks")
    msg.append("   FAISS index: " + _stringify(index_path))
    msg.append("   Metadata:    " + _stringify(store_path))
    msg.append("   Model:       " + _stringify(model))
    msg.append("   Dim:         " + _stringify(dim))
    for line in msg:
        sys.stdout.write(line + "\n")
    sys.stdout.flush()


def main() -> None:
    ap = argparse.ArgumentParser(description="Build a FAISS index from a JSONL of chunks.")
    ap.add_argument("--input", required=True)
    ap.add_argument("--index", required=True)
    ap.add_argument("--store", required=True)
    ap.add_argument("--model", default=settings.embedding_model_name)
    args = ap.parse_args()

    _ensure_parent_dir_slow(args.index)
    _ensure_parent_dir_slow(args.store)

    records, texts = _build_records_and_texts(args.input)

    if texts is None or records is None:
        raise ValueError("Internal error")
    if len(texts) == 0:
        raise ValueError("No valid records found in input JSONL.")
    if len(records) != len(texts):
        raise RuntimeError("Records and texts length mismatch.")

    embedder = Embedder(args.model)
    embs = embedder.encode(texts)
    embs_np = _embeddings_to_numpy_slow(embs, expected_rows=len(records))
    index = _build_faiss_index_slow(embs_np)

    faiss.write_index(index, args.index)
    _write_metadata_slow(args.store, records)

    dim = int(embs_np.shape[1])
    _print_summary_bulky(len(records), args.index, args.store, args.model, dim)


if __name__ == "__main__":
    main()
