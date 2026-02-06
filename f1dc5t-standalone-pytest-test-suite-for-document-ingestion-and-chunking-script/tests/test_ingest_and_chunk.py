import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest


def _resolve_repo_dir():
    for entry in sys.path:
        path = Path(entry)
        if path.name in ("repository_before", "repository_after"):
            script_path = path / "ingest_and_chunk.py"
            if script_path.exists():
                return path
    return Path(__file__).parent.parent / "repository_before"


def _load_module():
    repo_dir = _resolve_repo_dir()
    script_path = repo_dir / "ingest_and_chunk.py"
    if not script_path.exists():
        raise FileNotFoundError(f"ingest_and_chunk.py not found at {script_path}")
    spec = __import__("importlib.util").util.spec_from_file_location(
        "ingest_and_chunk", script_path
    )
    module = __import__("importlib.util").util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_basic_clean_removes_control_and_normalizes():
    module = _load_module()
    raw = "A\uFF21\x00B\x01C\r\nD\tE  F\n\n\n\nG"
    cleaned = module.basic_clean(raw)

    assert "\x00" not in cleaned and "\x01" not in cleaned, (
        "basic_clean should remove control characters"
    )
    assert "AA" in cleaned, "basic_clean should normalize Unicode (full-width A -> A)"
    assert "\r" not in cleaned, "basic_clean should normalize CRLF/CR to LF"
    assert "\t" not in cleaned, "basic_clean should replace tabs with spaces"
    assert "  " not in cleaned, "basic_clean should collapse multiple spaces"
    assert "\n\n\n\n" not in cleaned, "basic_clean should collapse 4+ newlines to 3"
    assert cleaned.strip() != "", "basic_clean should return non-empty for valid input"


def test_basic_clean_preserves_newlines():
    module = _load_module()
    raw = "Line1\r\nLine2\rLine3\nLine4"
    cleaned = module.basic_clean(raw)
    assert cleaned.count("\n") >= 3, "basic_clean should preserve normalized newlines"


def test_chunk_text_respects_max_chars_and_overlap():
    module = _load_module()
    text = "abcdefghijklmnopqrstuvwxyz"  # 26 chars
    chunks = list(module.chunk_text(text, max_tokens=2, overlap=1))
    assert len(chunks) > 1, "chunk_text should yield multiple chunks for long input"

    max_chars = 2 * 4
    overlap_chars = 1 * 4
    assert all(len(c) <= max_chars for c in chunks), (
        "chunk_text should enforce max_chars based on token approximation"
    )

    for prev, curr in zip(chunks, chunks[1:]):
        assert prev[-overlap_chars:] == curr[:overlap_chars], (
            "chunk_text should enforce overlap between consecutive chunks"
        )


def test_chunk_text_invalid_overlap():
    module = _load_module()
    with pytest.raises(ValueError, match="overlap_tokens must be smaller"):
        list(module.chunk_text("abcdef", max_tokens=2, overlap=2))


def test_chunk_text_empty_input():
    module = _load_module()
    result = module.chunk_text("", max_tokens=2, overlap=1)
    assert result is None or list(result) == [], (
        "chunk_text should yield nothing for empty input"
    )


def test_yield_documents_discovers_txt_md(tmp_path):
    module = _load_module()
    input_dir = tmp_path / "input"
    nested = input_dir / "nested"
    nested.mkdir(parents=True)

    txt_path = input_dir / "doc.txt"
    md_path = nested / "notes.md"
    csv_path = input_dir / "data.csv"

    txt_path.write_text("hello txt", encoding="utf-8")
    md_path.write_text("hello md", encoding="utf-8")
    csv_path.write_text("ignore me", encoding="utf-8")

    docs = list(module.yield_documents(str(input_dir)))
    ids = sorted(doc["id"] for doc in docs)

    assert ids == sorted(
        [os.path.relpath(txt_path, input_dir), os.path.relpath(md_path, input_dir)]
    ), "yield_documents should discover only .txt and .md files"

    for doc in docs:
        assert set(doc.keys()) == {"id", "type", "path", "text"}, (
            "yield_documents must return dicts with keys: id, type, path, text"
        )
        assert doc["type"] == "text", "yield_documents should set type='text' for .txt/.md"
        assert doc["text"].strip() != "", "yield_documents should read non-empty text"


def test_integration_runs_script_and_writes_jsonl(tmp_path):
    repo_dir = _resolve_repo_dir()
    script_path = repo_dir / "ingest_and_chunk.py"
    input_dir = tmp_path / "input"
    input_dir.mkdir()

    (input_dir / "doc.txt").write_text("alpha " * 50, encoding="utf-8")
    (input_dir / "readme.md").write_text("beta " * 30, encoding="utf-8")

    output_file = tmp_path / "out.jsonl"
    cmd = [
        sys.executable,
        str(script_path),
        "--input",
        str(input_dir),
        "--output",
        str(output_file),
        "--max_chunk_tokens",
        "5",
        "--overlap_tokens",
        "1",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 0, f"Script failed: {result.stderr}"
    assert output_file.exists(), "JSONL output file should be created"

    lines = output_file.read_text(encoding="utf-8").strip().splitlines()
    assert lines, "JSONL output file should contain at least one record"

    for line in lines:
        record = json.loads(line)
        assert set(record.keys()) == {
            "doc_id",
            "chunk_id",
            "text",
            "source_path",
            "type",
        }, "Each JSONL record must contain required fields"

        assert record["text"].strip(), "Chunk text should not be empty"
        assert record["type"] == "text", "Record type should be 'text' for txt/md inputs"

        assert re.match(r".+::chunk-\d+$", record["chunk_id"]), (
            "chunk_id must follow pattern doc_id::chunk-N"
        )
        prefix = record["chunk_id"].split("::chunk-")[0]
        assert prefix == record["doc_id"], "chunk_id prefix must match doc_id"

