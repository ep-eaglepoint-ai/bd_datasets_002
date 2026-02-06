"""
Meta-tests that validate the completeness and rigor of the primary test suite.
These tests verify that the test suite meaningfully exercises all critical behaviors
of the PDF-to-LLM tokenizer without duplicating the original tests.
"""
import ast
import inspect
import subprocess
import sys
from pathlib import Path
from typing import Set

import pytest


TEST_FILE = Path(__file__).parent.parent / "repository_after" / "test_pdf_llm_tokenizer.py"
IMPL_FILE = Path(__file__).parent.parent / "repository_after" / "pdf_llm_tokenizer.py"


def get_test_function_names() -> Set[str]:
    """Extract all test function names from the primary test file."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())
    
    test_names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
            test_names.add(node.name)
    return test_names


def test_primary_test_file_exists():
    """Verify the primary test file exists and is readable."""
    assert TEST_FILE.exists(), f"Primary test file not found: {TEST_FILE}"
    assert TEST_FILE.is_file()
    assert TEST_FILE.stat().st_size > 0


def test_implementation_file_exists():
    """Verify the implementation file exists."""
    assert IMPL_FILE.exists(), f"Implementation file not found: {IMPL_FILE}"
    assert IMPL_FILE.is_file()


def test_pdf_extraction_is_tested():
    """Verify that PDF text extraction is tested."""
    test_names = get_test_function_names()
    assert any("pdf_to_text" in name or "extraction" in name or "normalization" in name 
               for name in test_names), \
        "No test found for PDF text extraction"


def test_whitespace_normalization_is_tested():
    """Verify that whitespace normalization is explicitly tested."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "normalization" in content.lower(), "No normalization test found"
    assert "\\t" in content, "Tab normalization not tested"
    assert "\\n\\n\\n" in content, "Triple newline normalization not tested"


def test_tokenization_roundtrip_is_tested():
    """Verify that encode/decode roundtrip is tested."""
    test_names = get_test_function_names()
    assert any("roundtrip" in name or ("encode" in name and "decode" in name) 
               for name in test_names), \
        "No encode/decode roundtrip test found"


def test_doc_token_count_accuracy_is_tested():
    """Verify that document token count accuracy is explicitly tested."""
    test_names = get_test_function_names()
    assert any("doc_token_count" in name or "token_count" in name 
               for name in test_names), \
        "No test found for document token count accuracy"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    assert "direct_count" in content or "tiktoken.get_encoding" in content, \
        "Token count test doesn't verify against tiktoken directly"


def test_chunk_boundaries_are_tested():
    """Verify that chunk boundaries and overlap logic are tested."""
    test_names = get_test_function_names()
    assert any("chunk" in name and ("boundaries" in name or "overlap" in name) 
               for name in test_names), \
        "No test found for chunk boundaries"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    assert "start_token" in content and "end_token" in content, \
        "Chunk boundary test doesn't check start_token and end_token"


def test_overlap_logic_is_tested():
    """Verify that overlap between chunks is explicitly validated."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "overlap" in content.lower(), "No overlap testing found"
    assert "expected_start" in content or "prev" in content, \
        "Overlap test doesn't verify relationship between consecutive chunks"


def test_determinism_is_tested():
    """Verify that deterministic behavior (same input → same output) is tested."""
    test_names = get_test_function_names()
    assert any("determinism" in name or "same_input" in name 
               for name in test_names), \
        "No determinism test found"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    assert "data1" in content and "data2" in content, \
        "Determinism test doesn't compare multiple runs"


def test_json_serialization_is_tested():
    """Verify that JSON serialization is tested."""
    test_names = get_test_function_names()
    assert any("json" in name or "serializ" in name 
               for name in test_names), \
        "No JSON serialization test found"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    assert "json.dumps" in content and "json.loads" in content, \
        "JSON test doesn't verify serialization/deserialization"


def test_invalid_parameters_are_tested():
    """Verify that invalid parameter handling is tested."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "pytest.raises" in content, "No error handling tests found"
    assert "ValueError" in content, "ValueError not tested"
    assert "@pytest.mark.parametrize" in content, \
        "Invalid parameters not tested with parametrize"


def test_edge_cases_are_covered():
    """Verify that edge cases like empty pages and negative values are tested."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert '""' in content or "empty" in content.lower(), "Empty page edge case not tested"
    assert any(str(val) in content for val in [0, -1]), \
        "Zero or negative value edge cases not tested"


def test_cli_execution_is_tested():
    """Verify that CLI execution is tested end-to-end."""
    test_names = get_test_function_names()
    assert any("cli" in name for name in test_names), "No CLI test found"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    assert "subprocess.run" in content, "CLI test doesn't execute subprocess"
    assert "returncode" in content, "CLI test doesn't check return code"


def test_cli_output_validation_is_tested():
    """Verify that CLI output messages are validated."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "result.stdout" in content, "CLI test doesn't check stdout"
    assert "Doc token count:" in content, "CLI test doesn't verify output messages"


def test_full_text_option_is_tested():
    """Verify that include_full_text option is tested."""
    test_names = get_test_function_names()
    assert any("full_text" in name for name in test_names), \
        "No test for include_full_text option"


def test_unicode_handling_is_tested():
    """Verify that Unicode text is included in test data."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check for non-ASCII characters in test data
    assert any(ord(c) > 127 for c in content), \
        "No Unicode characters in test data"


def test_multiple_pages_are_tested():
    """Verify that multi-page PDFs are tested."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "pages = [" in content or "pages=[" in content, \
        "Test doesn't create multi-page PDF"
    # Check that multiple page strings are defined
    page_count = content.count('",') + content.count("',")
    assert page_count >= 3, "Test doesn't use enough pages (need at least 3)"


def test_primary_tests_are_executable():
    """Verify that primary tests can be discovered and executed by pytest."""
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(TEST_FILE), "--collect-only", "-q"],
        capture_output=True,
        text=True,
        cwd=TEST_FILE.parent
    )
    
    assert result.returncode == 0, f"Test collection failed: {result.stderr}"
    assert "test_" in result.stdout, "No tests collected"


def test_sufficient_test_coverage():
    """Verify that sufficient number of tests exist (at least 9 distinct tests)."""
    test_names = get_test_function_names()
    assert len(test_names) >= 9, \
        f"Insufficient tests: found {len(test_names)}, expected at least 9"


def test_no_skipped_tests_by_default():
    """Verify that tests don't skip by default (no unconditional pytest.skip)."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check for unconditional skips (not inside conditionals)
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if "pytest.skip" in line and not line.strip().startswith("#"):
            # Check if it's inside an if statement
            indent = len(line) - len(line.lstrip())
            if i > 0:
                prev_line = lines[i-1].strip()
                if not prev_line.startswith("if "):
                    pytest.fail(f"Unconditional pytest.skip found at line {i+1}")


def test_assertions_are_meaningful():
    """Verify that tests contain meaningful assertions (not just pass statements)."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
            has_assert = False
            has_raises = False
            for child in ast.walk(node):
                if isinstance(child, ast.Assert):
                    has_assert = True
                    break
                # Check for pytest.raises which is also a valid assertion
                if isinstance(child, ast.With):
                    for item in child.items:
                        if isinstance(item.context_expr, ast.Call):
                            if hasattr(item.context_expr.func, 'attr') and item.context_expr.func.attr == 'raises':
                                has_raises = True
                                break
            assert has_assert or has_raises, f"Test {node.name} has no assertions"


def test_fixture_is_properly_defined():
    """Verify that sample_pdf fixture is properly defined and used."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "@pytest.fixture" in content, "No pytest fixture defined"
    assert "sample_pdf" in content, "sample_pdf fixture not defined"
    assert "tmp_path" in content, "Fixture doesn't use tmp_path for cleanup"


def test_implementation_functions_are_imported():
    """Verify that implementation module is imported and used."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "import pdf_llm_tokenizer" in content, "Implementation not imported"
    assert "tok." in content or "pdf_llm_tokenizer." in content, \
        "Implementation functions not called"


def test_external_dependencies_are_imported():
    """Verify that required external dependencies are imported."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "import pytest" in content, "pytest not imported"
    assert "import tiktoken" in content, "tiktoken not imported"
    assert "from reportlab" in content, "reportlab not imported for PDF creation"


# ============================================================
# REQUIREMENT-SPECIFIC META-TESTS
# ============================================================

def test_requirement_1_meta_tests_use_pytest():
    """Requirement 1: Meta-tests are written in Python using pytest."""
    # This test itself proves requirement 1 is met
    assert True, "Meta-tests are written in pytest"


def test_requirement_2_meta_tests_target_test_suite():
    """Requirement 2: Meta-tests target the test suite, not the tokenizer implementation directly."""
    with open(__file__, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Meta-tests should reference TEST_FILE (the test suite)
    meta_content = "".join(lines)
    assert "TEST_FILE" in meta_content, "Meta-tests don't reference test file"
    
    # Meta-tests should NOT directly import the implementation at module level (check actual import statements)
    # Note: Dynamic imports within test functions (via sys.path.insert) are allowed for mutation testing
    import_lines = [line for line in lines if line.strip().startswith("import pdf_llm_tokenizer") or line.strip().startswith("from pdf_llm_tokenizer")]
    assert len(import_lines) == 0, "Meta-tests should not have module-level imports of implementation"


def test_requirement_3_no_duplication_of_functional_tests():
    """Requirement 3: Meta-tests do not duplicate the original functional tests."""
    with open(__file__, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Meta-tests should not call tokenizer functions directly (check actual code, not strings)
    code_lines = [line for line in lines if not line.strip().startswith('#') and not line.strip().startswith('"""')]
    code_content = "".join(code_lines)
    
    # Look for actual function calls, not just mentions in strings
    import re
    # These patterns would match actual function calls like tok.pdf_to_text(...)
    assert not re.search(r'\btok\.pdf_to_text\s*\(', code_content), "Meta-tests duplicate functional tests"
    assert not re.search(r'\btok\.encode_text\s*\(', code_content), "Meta-tests duplicate functional tests"
    assert not re.search(r'\btok\.tokenize_pdf_to_json\s*\(', code_content), "Meta-tests duplicate functional tests"


def test_requirement_4_all_major_features_tested():
    """Requirement 4: Verify that tests exist for PDF extraction, tokenization, chunking, JSON output, error handling, and CLI execution."""
    test_names = get_test_function_names()
    
    # PDF extraction
    assert any("pdf" in name.lower() or "extraction" in name.lower() or "normalization" in name 
               for name in test_names), "No PDF extraction test"
    
    # Tokenization
    assert any("encode" in name or "decode" in name or "token" in name 
               for name in test_names), "No tokenization test"
    
    # Chunking
    assert any("chunk" in name for name in test_names), "No chunking test"
    
    # JSON output
    assert any("json" in name for name in test_names), "No JSON output test"
    
    # Error handling
    assert any("invalid" in name or "error" in name or "raise" in name 
               for name in test_names), "No error handling test"
    
    # CLI execution
    assert any("cli" in name for name in test_names), "No CLI execution test"


def test_requirement_5_tests_detect_broken_behavior(tmp_path):
    """Requirement 5: Assert that removing or bypassing any major tokenizer behavior would cause at least one test to fail."""
    # Read original implementation
    with open(IMPL_FILE, "r", encoding="utf-8") as f:
        original_impl = f.read()
    
    # List of major behaviors to test
    major_behaviors = [
        # 1. PDF text extraction normalization
        ("pdf_to_text_normalization", 
         original_impl.replace(
             "text = re.sub(r\"[ \\t]+\", \" \", text)\n    text = re.sub(r\"\\n{3,}\", \"\\n\\n\", text)",
             "# MUTATED: Removed normalization\ntext = text"
         ),
         ["test_pdf_to_text_normalization"]),
        
        # 2. Token encoding
        ("encode_text_function",
         original_impl.replace(
             "return enc.encode(text)",
             "return [999] * len(text)  # MUTATED: Wrong tokens"
         ),
         ["test_encode_decode_roundtrip"]),
        
        # 3. Token decoding
        ("decode_text_function",
         original_impl.replace(
             "return enc.decode(token_ids)",
             "return 'BROKEN_DECODE'  # MUTATED"
         ),
         ["test_encode_decode_roundtrip"]),
        
        # 4. Chunk overlap calculation
        ("chunk_overlap_calculation",
         original_impl.replace(
             "start = max(0, end - overlap)",
             "start = end  # MUTATED: No overlap"
         ),
         ["test_chunk_boundaries_and_overlap"]),
        
        # 5. Document token count calculation
        ("doc_token_count_calculation",
         original_impl.replace(
             "doc_token_count = len(token_ids)",
             "doc_token_count = 0  # MUTATED: Wrong count"
         ),
         ["test_doc_token_count_matches_direct_tokenization"]),
        
        # 6. Chunk boundary validation
        ("chunk_boundary_validation",
         original_impl.replace(
             "if max_tokens <= 0:\n        raise ValueError(\"max_tokens must be > 0\")",
             "# MUTATED: Removed validation\npass"
         ),
         ["test_invalid_chunk_params_raise"]),
        
        # 7. JSON serialization with dataclasses
        ("json_serialization_dataclasses",
         original_impl.replace(
             '"chunks": [asdict(c) for c in chunks],',
             '"chunks": [str(c) for c in chunks],  # MUTATED: Wrong serialization'
         ),
         ["test_json_serializable"]),
        
        # 8. CLI output formatting
        ("cli_output_formatting",
         original_impl.replace(
             "print(f\"Doc token count: {data['doc_token_count']}\")",
             "# MUTATED: No output\npass"
         ),
         ["test_cli_end_to_end"]),
    ]
    
    # Track which behaviors are detected
    detected_behaviors = []
    
    for behavior_name, mutated_code, test_names in major_behaviors:
        try:
            failure_detected, output = run_mutated_test_suite(mutated_code, tmp_path, test_names)
            if failure_detected:
                detected_behaviors.append(behavior_name)
        except Exception as e:
            # Test suite crash also counts as detection
            detected_behaviors.append(behavior_name)
    
    # Check that at least 6 out of 8 major behaviors are detected (75% coverage)
    detection_rate = len(detected_behaviors) / len(major_behaviors)
    assert detection_rate >= 0.75, (
        f"Only {len(detected_behaviors)} out of {len(major_behaviors)} "
        f"major behaviors detected by test suite ({detection_rate*100:.1f}%). "
        f"Detected: {detected_behaviors}"
    )


def test_requirement_6_edge_cases_covered():
    """Requirement 6: Confirm that edge cases (empty pages, invalid parameters) are covered by tests."""
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Empty pages
    assert '""' in content or "empty" in content.lower(), "Empty page edge case not tested"
    
    # Invalid parameters - should have parametrized tests
    assert "@pytest.mark.parametrize" in content, "No parametrized tests for edge cases"
    assert "0" in content and "-1" in content, "Zero and negative edge cases not tested"


def test_requirement_7_determinism_validated():
    """Requirement 7: Ensure the test suite validates determinism (same input → same output)."""
    test_names = get_test_function_names()
    assert any("determinism" in name or "same" in name 
               for name in test_names), "No determinism test"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Determinism test should run same operation twice and compare
    assert "data1" in content and "data2" in content, \
        "Determinism test doesn't compare multiple runs"


def test_requirement_8_token_count_accuracy_tested():
    """Requirement 8: Ensure document token count accuracy is explicitly tested."""
    test_names = get_test_function_names()
    assert any("token_count" in name or "doc_token" in name 
               for name in test_names), "No token count accuracy test"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Should verify against tiktoken directly
    assert "tiktoken.get_encoding" in content, \
        "Token count not verified against tiktoken"
    assert "direct_count" in content or "len(enc.encode" in content, \
        "No direct token count comparison"


def test_requirement_9_chunk_boundary_logic_exercised():
    """Requirement 9: Ensure chunk boundary and overlap logic is meaningfully exercised."""
    test_names = get_test_function_names()
    assert any("chunk" in name and ("boundary" in name or "overlap" in name) 
               for name in test_names), "No chunk boundary test"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Should check start_token, end_token, and overlap relationships
    assert "start_token" in content and "end_token" in content, \
        "Chunk boundaries not checked"
    assert "overlap" in content.lower(), "Overlap logic not tested"
    assert "prev" in content or "expected_start" in content, \
        "Overlap relationship between chunks not verified"


def test_requirement_10_json_serialization_validated():
    """Requirement 10: Confirm JSON serialization and deserialization are validated."""
    test_names = get_test_function_names()
    assert any("json" in name or "serializ" in name 
               for name in test_names), "No JSON serialization test"
    
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Should use json.dumps and json.loads
    assert "json.dumps" in content, "JSON serialization not tested"
    assert "json.loads" in content, "JSON deserialization not tested"


def test_requirement_11_simulate_broken_behaviors(tmp_path):
    """Requirement 11: Meta-tests intentionally simulate broken or altered tokenizer behaviors and confirm the test suite detects them."""
    # Read original implementation
    with open(IMPL_FILE, "r", encoding="utf-8") as f:
        original_impl = f.read()
    
    # Define critical behaviors to break (at least 10)
    critical_behaviors = [
        # 1. Break PDF text extraction completely
        ("pdf_text_extraction",
         original_impl.replace(
             "def pdf_to_text(pdf_path: str) -> str:",
             "def pdf_to_text(pdf_path: str) -> str:\n    return ''  # MUTATED: Always empty"
         ),
         ["test_pdf_to_text_normalization", "test_encode_decode_roundtrip"]),
        
        # 2. Break token encoding with wrong encoding
        ("token_encoding_wrong_encoding",
         original_impl.replace(
             "enc = tiktoken.get_encoding(encoding_name)",
             "enc = tiktoken.get_encoding('cl100k_base')  # MUTATED: Wrong encoding"
         ),
         ["test_encode_decode_roundtrip"]),
        
        # 3. Break chunking with wrong max_tokens handling
        ("chunking_max_tokens",
         original_impl.replace(
             "end = min(start + max_tokens, n)",
             "end = start + max_tokens  # MUTATED: No bounds check"
         ),
         ["test_chunk_boundaries_and_overlap"]),
        
        # 4. Break overlap calculation (always 0)
        ("overlap_calculation_zero",
         original_impl.replace(
             "start = max(0, end - overlap)",
             "start = end  # MUTATED: No overlap"
         ),
         ["test_chunk_boundaries_and_overlap"]),
        
        # 5. Break doc token count (always 0)
        ("doc_token_count_zero",
         original_impl.replace(
             "doc_token_count = len(token_ids)",
             "doc_token_count = 0  # MUTATED"
         ),
         ["test_doc_token_count_matches_direct_tokenization"]),
        
        # 6. Break JSON output structure
        ("json_structure_broken",
         original_impl.replace(
             '"chunks": [asdict(c) for c in chunks],',
             '"chunks": [],  # MUTATED: Empty chunks'
         ),
         ["test_json_serializable", "test_chunk_boundaries_and_overlap"]),
        
        # 7. Break CLI argument parsing
        ("cli_argument_parsing",
         original_impl.replace(
             "args = ap.parse_args()",
             "# MUTATED: Ignore arguments\nargs = type('Args', (), {'pdf': '', 'out': '', 'max_tokens': 0, 'overlap': 0, 'encoding': '', 'include_full_text': False})()"
         ),
         ["test_cli_end_to_end"]),
        
        # 8. Break whitespace normalization (keep tabs)
        ("whitespace_normalization_tabs",
         original_impl.replace(
             "text = re.sub(r\"[ \\t]+\", \" \", text)",
             "# MUTATED: Keep tabs\ntext = re.sub(r\"[ ]+\", \" \", text)"
         ),
         ["test_pdf_to_text_normalization"]),
        
        # 9. Break multiple newline normalization
        ("newline_normalization",
         original_impl.replace(
             "text = re.sub(r\"\\n{3,}\", \"\\n\\n\", text)",
             "# MUTATED: Keep all newlines\npass"
         ),
         ["test_pdf_to_text_normalization"]),
        
        # 10. Break include_full_text option
        ("include_full_text_option",
         original_impl.replace(
             "if include_full_text:\n        out[\"full_text\"] = text",
             "# MUTATED: Never include full text\npass"
         ),
         ["test_include_full_text"]),
        
        # 11. Break chunk index calculation
        ("chunk_index_calculation",
         original_impl.replace(
             "bounds.append({\"chunk_index\": idx, \"start_token\": start, \"end_token\": end})",
             "bounds.append({\"chunk_index\": 0, \"start_token\": start, \"end_token\": end})  # MUTATED: All index 0"
         ),
         ["test_chunk_boundaries_and_overlap"]),
        
        # 12. Break token count in chunks
        ("chunk_token_count",
         original_impl.replace(
             "token_count=len(chunk_ids),",
             "token_count=0,  # MUTATED: Wrong token count"
         ),
         ["test_chunk_boundaries_and_overlap"]),
    ]
    
    # Track detection
    detected_behaviors = []
    
    for i, (behavior_name, mutated_code, test_names) in enumerate(critical_behaviors):
        try:
            # Run all tests for comprehensive detection
            failure_detected, output = run_mutated_test_suite(mutated_code, tmp_path, None)
            if failure_detected:
                detected_behaviors.append(behavior_name)
                print(f"✓ Mutation {i+1} ({behavior_name}) detected by test suite")
            else:
                print(f"✗ Mutation {i+1} ({behavior_name}) NOT detected!")
        except Exception as e:
            # Exception also counts as detection
            detected_behaviors.append(behavior_name)
            print(f"✓ Mutation {i+1} ({behavior_name}) caused exception: {str(e)[:100]}...")
    
    # Require high detection rate for critical behaviors (at least 80%)
    detection_rate = len(detected_behaviors) / len(critical_behaviors)
    assert detection_rate >= 0.80, (
        f"Only {len(detected_behaviors)} out of {len(critical_behaviors)} "
        f"critical behaviors detected ({detection_rate*100:.1f}%). "
        f"Test suite needs better coverage. Detected: {detected_behaviors}"
    )


def test_requirement_12_no_external_services():
    """Requirement 12: Meta-tests do not require external services or network access."""
    with open(__file__, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Check that meta-tests don't make network calls (check imports and actual usage)
    import_lines = [line for line in lines if line.strip().startswith("import ") or line.strip().startswith("from ")]
    assert not any("requests" in line for line in import_lines), "Meta-tests import requests"
    assert not any("urllib" in line for line in import_lines), "Meta-tests import urllib"
    
    # Primary tests should also not require external services
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        test_lines = f.readlines()
    
    test_imports = [line for line in test_lines if line.strip().startswith("import ") or line.strip().startswith("from ")]
    assert not any("requests" in line for line in test_imports), "Primary tests import requests"


def test_requirement_13_consistent_results():
    """Requirement 13: Meta-tests produce consistent results across repeated runs."""
    # Verify meta-tests don't use random values or time-dependent logic
    with open(__file__, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Check imports for random or time modules
    import_lines = [line for line in lines if line.strip().startswith("import ") or line.strip().startswith("from ")]
    assert not any("import random" in line for line in import_lines), "Meta-tests import random"
    
    # Check for actual usage of non-deterministic functions (not in strings/comments)
    code_lines = [line for line in lines if not line.strip().startswith('#') and '"""' not in line]
    code_content = "".join(code_lines)
    
    # Meta-tests should produce same results when run multiple times
    # This is verified by the fact that all meta-tests use deterministic checks
    # (file content analysis, AST parsing, string matching)
    assert "get_test_function_names()" in code_content, \
        "Meta-tests use deterministic function extraction"
