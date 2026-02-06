import argparse
import json
import os
import re
import unicodedata
from pathlib import Path
import fitz


def basic_clean(text: str) -> str:
    if text is None:
        return ""

    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\x00", "")

    cleaned_chars = []
    for ch in text:
        if ch in ("\n", "\t"):
            cleaned_chars.append(ch)
            continue
        if unicodedata.category(ch) == "Cc":
            continue
        cleaned_chars.append(ch)
    text = "".join(cleaned_chars)

    text = text.replace("\t", " ")
    text = re.sub(r"[ ]{2,}", " ", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)

    return text.strip()


def extract_text_from_pdf(path: str) -> str:
    doc = fitz.open(path)
    parts = []
    for page in doc:
        parts.append(page.get_text("text"))
    return "\n".join(parts)


def yield_documents(input_dir: str):
    for root, _, files in os.walk(input_dir):
        for f in files:
            p = os.path.join(root, f)
            ext = Path(p).suffix.lower()

            if ext == ".pdf":
                yield {
                    "id": os.path.relpath(p, input_dir),
                    "type": "pdf",
                    "path": p,
                    "text": extract_text_from_pdf(p),
                }

            elif ext in [".txt", ".md"]:
                with open(p, "r", encoding="utf-8", errors="ignore") as fh:
                    yield {
                        "id": os.path.relpath(p, input_dir),
                        "type": "text",
                        "path": p,
                        "text": fh.read(),
                    }


def chunk_text(text: str, max_tokens: int = 500, overlap: int = 50):
    if not text:
        return

    max_chars = max_tokens * 4
    ov_chars = overlap * 4

    if ov_chars >= max_chars:
        raise ValueError("overlap_tokens must be smaller than max_chunk_tokens")

    start = 0
    n = len(text)
    while start < n:
        end = min(n, start + max_chars)
        yield text[start:end]
        if end == n:
            break
        start = end - ov_chars


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--max_chunk_tokens", type=int, default=500)
    ap.add_argument("--overlap_tokens", type=int, default=50)
    args = ap.parse_args()

    out_dir = os.path.dirname(args.output)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as out:
        for doc in yield_documents(args.input):
            cleaned = basic_clean(doc["text"])
            for i, chunk in enumerate(
                chunk_text(cleaned, args.max_chunk_tokens, args.overlap_tokens)
            ):
                rec = {
                    "doc_id": doc["id"],
                    "chunk_id": f"{doc['id']}::chunk-{i}",
                    "text": chunk,
                    "source_path": doc["path"],
                    "type": doc["type"],
                }
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
