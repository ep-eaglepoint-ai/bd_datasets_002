#!/usr/bin/env python3

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_ENV_VAR = "EMBEDDING_MODEL"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a FAISS semantic search index from a JSONL file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python build_index.py --input docs.jsonl --index search.index --metadata search_metadata.jsonl
  python build_index.py -i docs.jsonl -o search.index -m search_metadata.jsonl --model all-mpnet-base-v2
        """
    )
    
    parser.add_argument(
        "--input", "-i",
        type=str,
        required=True,
        help="Path to input JSONL file containing documents with 'text' field"
    )
    
    parser.add_argument(
        "--index", "-o",
        type=str,
        required=True,
        help="Path to output FAISS index file"
    )
    
    parser.add_argument(
        "--metadata", "-m",
        type=str,
        required=True,
        help="Path to output metadata JSONL file"
    )
    
    default_model = os.environ.get(MODEL_ENV_VAR, DEFAULT_MODEL)
    parser.add_argument(
        "--model",
        type=str,
        default=default_model,
        help=f"Sentence Transformers model name (default: {DEFAULT_MODEL}, "
             f"can also set via {MODEL_ENV_VAR} environment variable)"
    )
    
    return parser.parse_args()


def load_jsonl(file_path: str) -> list[dict[str, Any]]:
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {file_path}")
    
    records: list[dict[str, Any]] = []
    
    with open(path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
                
            try:
                record = json.loads(line)
            except json.JSONDecodeError as e:
                raise ValueError(
                    f"Invalid JSON on line {line_num}: {e}"
                ) from e
            
            if "text" not in record:
                raise ValueError(
                    f"Missing required 'text' field on line {line_num}"
                )
            
            if not isinstance(record["text"], str):
                raise ValueError(
                    f"Field 'text' must be a string on line {line_num}"
                )
            
            if not record["text"].strip():
                raise ValueError(
                    f"Field 'text' cannot be empty on line {line_num}"
                )
            
            records.append(record)
    
    if not records:
        raise ValueError("Input file contains no valid records")
    
    return records


def generate_embeddings(
    texts: list[str],
    model: SentenceTransformer
) -> np.ndarray:
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        convert_to_numpy=True
    )
    
    if embeddings.ndim != 2:
        raise ValueError(
            f"Expected 2D embedding array, got shape {embeddings.shape}"
        )
    
    if embeddings.shape[0] != len(texts):
        raise ValueError(
            f"Embedding count mismatch: got {embeddings.shape[0]}, expected {len(texts)}"
        )
    
    faiss.normalize_L2(embeddings)
    
    return embeddings


def build_faiss_index(embeddings: np.ndarray) -> faiss.IndexFlatIP:
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    embeddings_f32 = embeddings.astype(np.float32)
    index.add(embeddings_f32)
    
    return index


def save_outputs(
    index: faiss.IndexFlatIP,
    records: list[dict[str, Any]],
    index_path: str,
    metadata_path: str
) -> None:
    index_dir = Path(index_path).parent
    metadata_dir = Path(metadata_path).parent
    
    if index_dir and not index_dir.exists():
        index_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {index_dir}")
    
    if metadata_dir and not metadata_dir.exists():
        metadata_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {metadata_dir}")
    
    faiss.write_index(index, index_path)
    
    with open(metadata_path, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def main() -> int:
    try:
        args = parse_args()
        
        print("=" * 60)
        print("Semantic Search Index Builder")
        print("=" * 60)
        
        print(f"\nConfiguration:")
        print(f"  Input file:     {args.input}")
        print(f"  Output index:   {args.index}")
        print(f"  Output metadata: {args.metadata}")
        print(f"  Embedding model: {args.model}")
        
        print(f"\nLoading input from: {args.input}")
        records = load_jsonl(args.input)
        print(f"  Loaded {len(records)} records")
        
        texts = [record["text"] for record in records]
        
        print(f"\nLoading embedding model: {args.model}")
        model = SentenceTransformer(args.model)
        
        print("\nGenerating embeddings...")
        embeddings = generate_embeddings(texts, model)
        embedding_dim = embeddings.shape[1]
        print(f"  Generated {len(embeddings)} embeddings")
        print(f"  Embedding dimensionality: {embedding_dim}")
        
        print("\nBuilding FAISS index...")
        index = build_faiss_index(embeddings)
        print(f"  Index contains {index.ntotal} vectors")
        
        print("\nSaving outputs...")
        save_outputs(index, records, args.index, args.metadata)
        print(f"  Saved FAISS index to: {args.index}")
        print(f"  Saved metadata to: {args.metadata}")
        
        print("\n" + "=" * 60)
        print("Index Build Complete!")
        print("=" * 60)
        print(f"  Records indexed:        {len(records)}")
        print(f"  Embedding dimensionality: {embedding_dim}")
        print(f"  Model used:             {args.model}")
        print("=" * 60)
        
        return 0
        
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Validation Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
