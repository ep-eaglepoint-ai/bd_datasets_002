import argparse
import json
import re
import sys
import logging
from typing import List, Dict, Any
import pypdf
import tiktoken

# Configure logging to stderr so stdout remains clean for JSON output
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

def normalize_text(text: str) -> str:
    """
    Normalizes excessive whitespace deterministically.
    Replaces sequences of whitespace with a single space and trims.
    """
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts text from a PDF file preserving page order.
    Gracefully handles empty pages or corrupted files.
    """
    full_text = []
    try:
        # strict=False helps with malformed PDFs
        reader = pypdf.PdfReader(pdf_path, strict=False)
        
        for i, page in enumerate(reader.pages):
            try:
                text = page.extract_text()
                if text:
                    full_text.append(text)
                else:
                    logger.warning(f"Page {i+1} yielded no text (empty or image-only).")
            except Exception as e:
                logger.warning(f"Error extracting text from page {i+1}: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Error reading PDF file '{pdf_path}': {e}")
        # Return empty string rather than crashing
        return ""

    combined_text = " ".join(full_text)
    return normalize_text(combined_text)

def get_encoding(encoding_name: str):
    """Safely retrieves the tokenizer encoding."""
    try:
        return tiktoken.get_encoding(encoding_name)
    except ValueError:
        logger.warning(f"Encoding '{encoding_name}' not found, falling back to 'cl100k_base'.")
        return tiktoken.get_encoding("cl100k_base")

def get_token_count(text: str, encoding_name: str = "o200k_base") -> int:
    """Returns the exact token count for the text using the specified encoding."""
    if not text:
        return 0
    encoding = get_encoding(encoding_name)
    return len(encoding.encode(text))

def chunk_text_by_tokens(
    text: str, 
    max_tokens: int, 
    overlap: int, 
    encoding_name: str = "o200k_base"
) -> List[str]:
    """
    Chunks text strictly by token count.
    Ensures sequential chunks with specified overlap.
    """
    if not text:
        return []
        
    encoding = get_encoding(encoding_name)
    tokens = encoding.encode(text)
    total_tokens = len(tokens)
    
    if total_tokens == 0:
        return []
    
    chunks = []
    start = 0
    
    # If the text is shorter than max_tokens, just return it as one chunk
    if total_tokens <= max_tokens:
        return [text]

    while start < total_tokens:
        end = min(start + max_tokens, total_tokens)
        chunk_tokens = tokens[start:end]
        
        # Decode back to text (Req 10: No semantic alteration/rewriting)
        chunk_text = encoding.decode(chunk_tokens)
        chunks.append(chunk_text)
        
        if end == total_tokens:
            break
            
        # Calculate next start position based on overlap
        # Ensure we move forward at least 1 token to prevent infinite loops if overlap >= max_tokens
        step = max(1, max_tokens - overlap)
        start += step
        
        # Safety check: if overlap calculation pushes us backwards or stays same (unlikely with logic above), fix it
        if start >= end:
            start = end

    return chunks

def process_pdf(
    pdf_path: str, 
    max_tokens: int = 512, 
    overlap: int = 50, 
    encoding_name: str = "o200k_base"
) -> Dict[str, Any]:
    """
    Main utility function to process a PDF.
    Returns a dictionary with token counts and chunks.
    """
    text = extract_text_from_pdf(pdf_path)
    
    # Req 14: Token count is derived from encoding the entire document text
    encoding = get_encoding(encoding_name)
    all_tokens = encoding.encode(text)
    total_token_count = len(all_tokens)
    
    chunks = chunk_text_by_tokens(text, max_tokens, overlap, encoding_name)
    
    return {
        "file": pdf_path,
        "encoding": encoding_name,
        "document_token_count": total_token_count,
        "chunk_count": len(chunks),
        "chunks": chunks
    }

def main():
    parser = argparse.ArgumentParser(description="Deterministic PDF to LLM Tokenizer")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("--max-tokens", type=int, default=512, help="Maximum tokens per chunk")
    parser.add_argument("--overlap", type=int, default=50, help="Token overlap between chunks")
    parser.add_argument("--encoding", default="o200k_base", help="Tiktoken encoding name")
    
    args = parser.parse_args()
    
    try:
        result = process_pdf(args.pdf_path, args.max_tokens, args.overlap, args.encoding)
        # Req 11: Produces identical output (stdout JSON)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()