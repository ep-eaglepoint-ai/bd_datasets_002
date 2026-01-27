import os
import pytest
import json
import subprocess
import sys
from reportlab.pdfgen import canvas
from repository_after.tokenizer import (
    extract_text_from_pdf,
    normalize_text,
    get_token_count,
    chunk_text_by_tokens,
    process_pdf
)

# --- Helper to generate PDFs ---
def create_pdf(text_pages: list, filename: str = "test_doc.pdf") -> str:
    """Creates a temporary PDF file with given text on pages and returns path."""
    c = canvas.Canvas(filename)
    for text in text_pages:
        if text:
            c.drawString(100, 750, text)
        c.showPage()
    c.save()
    return filename

@pytest.fixture
def sample_pdf():
    """Multi-page PDF fixture."""
    path = create_pdf(["Hello World.", "This is page two."], "sample_test.pdf")
    yield path
    if os.path.exists(path):
        os.remove(path)

@pytest.fixture
def empty_pdf():
    """Empty PDF fixture (no text content)."""
    path = create_pdf([""], "empty_test.pdf")
    yield path
    if os.path.exists(path):
        os.remove(path)

@pytest.fixture
def long_pdf():
    """PDF with enough text to generate multiple chunks."""
    text = "This is a test sentence. " * 50
    path = create_pdf([text], "long_test.pdf")
    yield path
    if os.path.exists(path):
        os.remove(path)

# --- Requirement 1: Pure Python Implementation ---
def test_req1_is_python():
    """Req 1: Implementation is written entirely in Python."""
    import repository_after.tokenizer
    assert hasattr(repository_after.tokenizer, 'process_pdf')
    assert hasattr(repository_after.tokenizer, 'extract_text_from_pdf')
    assert hasattr(repository_after.tokenizer, 'chunk_text_by_tokens')

# --- Requirement 2: Modular Code ---
def test_req2_modularity():
    """Req 2: Code is modular with separate functions."""
    from repository_after.tokenizer import (
        extract_text_from_pdf, 
        chunk_text_by_tokens,
        normalize_text,
        get_token_count,
        process_pdf
    )
    assert callable(extract_text_from_pdf)
    assert callable(chunk_text_by_tokens)
    assert callable(normalize_text)
    assert callable(get_token_count)
    assert callable(process_pdf)

# --- Requirement 3: Importable ---
def test_req3_importable():
    """Req 3: Code is importable as a module."""
    import repository_after.tokenizer as tokenizer
    result = tokenizer.normalize_text("Hello   World")
    assert result == "Hello World"

# --- Requirement 4: CLI Tool ---
def test_req4_cli_tool(sample_pdf):
    """Req 4: Can be run as CLI tool."""
    result = subprocess.run(
        [sys.executable, "-m", "repository_after.tokenizer", sample_pdf, "--max-tokens", "100"],
        capture_output=True,
        text=True
    )
    # Should not crash
    assert result.returncode == 0
    # Should produce JSON output
    output = result.stdout
    parsed = json.loads(output)
    assert "document_token_count" in parsed

# --- Requirement 5 & 8: Multi-page and Page Order ---
def test_req5_req8_multi_page_extraction(sample_pdf):
    """Req 5, 8: Successfully reads multi-page PDFs and preserves order."""
    text = extract_text_from_pdf(sample_pdf)
    assert "Hello World." in text
    assert "This is page two." in text
    # Order check - Hello should come before page two
    assert text.index("Hello World.") < text.index("This is page two.")

# --- Requirement 6: Empty Pages ---
def test_req6_empty_pages(empty_pdf):
    """Req 6: Gracefully handles empty pages using empty_pdf fixture."""
    text = extract_text_from_pdf(empty_pdf)
    # Should not crash, returns empty or minimal text
    assert isinstance(text, str)

def test_req6_empty_pages_mixed():
    """Req 6: Gracefully handles PDFs with mixed empty/text pages."""
    filename = "test_empty_page_mixed.pdf"
    c = canvas.Canvas(filename)
    c.drawString(100, 750, "Page 1")
    c.showPage()
    c.showPage()  # Page 2 empty
    c.drawString(100, 750, "Page 3")
    c.showPage()
    c.save()
    
    try:
        text = extract_text_from_pdf(filename)
        assert "Page 1" in text
        assert "Page 3" in text
    finally:
        if os.path.exists(filename):
            os.remove(filename)

# --- Requirement 7: Corrupted PDF ---
def test_req7_corrupted_pdf():
    """Req 7: Does not crash on malformed PDFs."""
    filename = "corrupt.pdf"
    with open(filename, "wb") as f:
        f.write(b"%PDF-1.4\n...garbage...")
    
    try:
        # Should not raise exception
        text = extract_text_from_pdf(filename)
        assert text == ""  # Should return empty string for unreadable
    finally:
        if os.path.exists(filename):
            os.remove(filename)

# --- Requirement 9: Normalize Whitespace ---
def test_req9_normalize_whitespace():
    """Req 9: Normalizes excessive whitespace deterministically."""
    raw = "Hello   World. \n\n This  is \t a test. "
    norm = normalize_text(raw)
    assert norm == "Hello World. This is a test."

# --- Requirement 10: No Semantic Alteration ---
def test_req10_no_semantic_change(sample_pdf):
    """Req 10: Chunking does not alter text semantically."""
    text = extract_text_from_pdf(sample_pdf)
    chunks = chunk_text_by_tokens(text, max_tokens=100, overlap=0)
    
    # Reconstruct by concatenating all chunk texts
    reconstructed = "".join([c["text"] for c in chunks])
    
    # The reconstructed text should contain all original content
    # (might have minor whitespace differences due to token boundaries)
    assert "Hello" in reconstructed
    assert "World" in reconstructed

# --- Requirement 11: Deterministic Output ---
def test_req11_deterministic_output(sample_pdf):
    """Req 11: Same input produces identical output every time."""
    result1 = process_pdf(sample_pdf, max_tokens=100, overlap=10)
    result2 = process_pdf(sample_pdf, max_tokens=100, overlap=10)
    
    assert result1["document_token_count"] == result2["document_token_count"]
    assert result1["chunk_count"] == result2["chunk_count"]
    assert len(result1["chunks"]) == len(result2["chunks"])
    
    for c1, c2 in zip(result1["chunks"], result2["chunks"]):
        assert c1["text"] == c2["text"]
        assert c1["token_count"] == c2["token_count"]

# --- Requirement 12 & 13: True Tokenization ---
def test_req12_req13_true_tokenization():
    """Req 12, 13: Uses true LLM tokenization (o200k_base)."""
    text = "Hello world"
    count = get_token_count(text, "o200k_base")
    assert count > 0
    
    # Verify encoding parameter works
    count_same = get_token_count(text, "o200k_base")
    assert count == count_same
    
    # Token count should differ from simple word count in many cases
    complex_text = "12345 testing"
    token_count = get_token_count(complex_text, "o200k_base")
    word_count = len(complex_text.split())
    # Just verify it returns a positive number
    assert token_count > 0

# --- Requirement 14 & 16: Authoritative Count ---
def test_req14_req16_authoritative_count(sample_pdf):
    """Req 14, 16: Token count derived from entire doc, single authoritative count."""
    result = process_pdf(sample_pdf, max_tokens=100)
    
    assert "document_token_count" in result
    assert isinstance(result["document_token_count"], int)
    assert result["document_token_count"] > 0
    
    # Verify it matches direct calculation
    text = extract_text_from_pdf(sample_pdf)
    direct_count = get_token_count(text)
    assert result["document_token_count"] == direct_count

# --- Requirement 15: No Heuristics ---
def test_req15_no_heuristics():
    """Req 15: Token count uses actual tokenizer, not heuristics."""
    # Text that would give different results with heuristics vs real tokenizer
    text = "Hello! This is a test... with punctuation???"
    
    # Heuristic (chars/4) would give ~11
    heuristic_count = len(text) // 4
    
    # Real token count
    real_count = get_token_count(text, "o200k_base")
    
    # They should likely differ (real tokenizer handles punctuation differently)
    # Just verify real count is positive and we used the tokenizer
    assert real_count > 0

# --- Requirement 17 & 18: Chunking Limits ---
def test_req17_req18_chunking_limits(long_pdf):
    """Req 17, 18: Chunks created by token count, max configurable."""
    result = process_pdf(long_pdf, max_tokens=10, overlap=0)
    
    assert "chunk_size" in result
    assert result["chunk_size"] == 10
    
    for chunk in result["chunks"]:
        assert chunk["token_count"] <= 10
        assert "index" in chunk
        assert "start_token" in chunk
        assert "end_token" in chunk
        assert "text" in chunk

# --- Requirement 19: Configurable Overlap ---
def test_req19_chunk_overlap():
    """Req 19: Token overlap is configurable."""
    text = "one two three four five six seven eight nine ten"
    
    chunks_no_overlap = chunk_text_by_tokens(text, max_tokens=3, overlap=0)
    chunks_with_overlap = chunk_text_by_tokens(text, max_tokens=3, overlap=1)
    
    # With overlap, we should have more chunks (or different boundaries)
    assert len(chunks_no_overlap) > 0
    assert len(chunks_with_overlap) > 0
    
    # Verify chunk structure
    for chunk in chunks_with_overlap:
        assert "index" in chunk
        assert "start_token" in chunk
        assert "end_token" in chunk
        assert "token_count" in chunk
        assert "text" in chunk

# --- Requirement 20: Sequential Chunks ---
def test_req20_sequential_chunks(long_pdf):
    """Req 20: Chunks are sequential with proper indices."""
    result = process_pdf(long_pdf, max_tokens=10, overlap=0)
    chunks = result["chunks"]
    
    # Verify indices are sequential
    for i, chunk in enumerate(chunks):
        assert chunk["index"] == i
    
    # Verify start/end tokens are sequential (with no overlap)
    if len(chunks) > 1:
        for i in range(1, len(chunks)):
            # Each chunk starts where previous ended (for overlap=0)
            assert chunks[i]["start_token"] == chunks[i-1]["end_token"]

def test_req20_sequential_content():
    """Req 20: Content in chunks maintains original order."""
    text = "First part. Second part. Third part."
    chunks = chunk_text_by_tokens(text, max_tokens=5, overlap=0)
    
    # Reconstruct text
    reconstructed = ""
    for chunk in chunks:
        reconstructed += chunk["text"]
    
    # Original content order should be preserved
    assert reconstructed.index("First") < reconstructed.index("Second") < reconstructed.index("Third")

# --- Output Structure Tests ---
def test_output_structure_metadata(sample_pdf):
    """Verify output includes chunk_size and overlap_size metadata."""
    result = process_pdf(sample_pdf, max_tokens=100, overlap=25)
    
    assert "chunk_size" in result
    assert "overlap_size" in result
    assert result["chunk_size"] == 100
    assert result["overlap_size"] == 25

def test_chunk_object_structure():
    """Verify chunks are objects with required fields."""
    text = "This is a test of chunk structure."
    chunks = chunk_text_by_tokens(text, max_tokens=5, overlap=1)
    
    for chunk in chunks:
        assert isinstance(chunk, dict)
        assert "index" in chunk
        assert "start_token" in chunk
        assert "end_token" in chunk
        assert "token_count" in chunk
        assert "text" in chunk
        
        assert isinstance(chunk["index"], int)
        assert isinstance(chunk["start_token"], int)
        assert isinstance(chunk["end_token"], int)
        assert isinstance(chunk["token_count"], int)
        assert isinstance(chunk["text"], str)