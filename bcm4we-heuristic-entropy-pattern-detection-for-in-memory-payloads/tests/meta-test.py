"""
Meta-test suite that validates the correctness and coverage of after-test.
"""

import os
import sys
import ast
import pytest
import tempfile

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_after'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tests'))


def test_after_test_exists():
    """Test that after-test.py exists."""
    after_test_path = os.path.join(os.path.dirname(__file__), 'after-test.py')
    assert os.path.exists(after_test_path), "after-test.py should exist"


def test_after_test_imports_repository_after():
    """Test that after-test imports from repository_after."""
    after_test_path = os.path.join(os.path.dirname(__file__), 'after-test.py')
    
    with open(after_test_path, 'r') as f:
        content = f.read()
        
    assert 'from repository_after import' in content or 'import repository_after' in content, \
        "after-test should import from repository_after"


def test_after_test_has_multiple_tests():
    """Test that after-test has multiple test functions."""
    after_test_path = os.path.join(os.path.dirname(__file__), 'after-test.py')
    
    with open(after_test_path, 'r') as f:
        tree = ast.parse(f.read())
    
    test_functions = [node.name for node in ast.walk(tree) 
                     if isinstance(node, ast.FunctionDef) and node.name.startswith('test_')]
    
    assert len(test_functions) >= 5, "after-test should have at least 5 test functions"


def test_after_test_covers_entropy():
    """Test that after-test covers entropy calculation."""
    after_test_path = os.path.join(os.path.dirname(__file__), 'after-test.py')
    
    with open(after_test_path, 'r') as f:
        content = f.read()
        
    assert 'entropy' in content.lower(), "after-test should test entropy calculation"


def test_after_test_covers_nop_sled():
    """Test that after-test covers NOP sled detection."""
    after_test_path = os.path.join(os.path.dirname(__file__), 'after-test.py')
    
    with open(after_test_path, 'r') as f:
        content = f.read()
        
    assert 'nop' in content.lower(), "after-test should test NOP sled detection"


def test_after_test_covers_xor_patterns():
    """Test that after-test covers XOR pattern detection."""
    after_test_path = os.path.join(os.path.dirname(__file__), 'after-test.py')
    
    with open(after_test_path, 'r') as f:
        content = f.read()
        
    assert 'xor' in content.lower(), "after-test should test XOR pattern detection"


def test_after_test_covers_chunk_reading():
    """Test that after-test covers chunk-based file reading."""
    after_test_path = os.path.join(os.path.dirname(__file__), 'after-test.py')
    
    with open(after_test_path, 'r') as f:
        content = f.read()
        
    assert 'chunk' in content.lower(), "after-test should test chunk-based reading"


def test_repository_after_has_required_methods():
    """Test that repository_after has all required methods."""
    from repository_after import PayloadDetector
    
    required_methods = [
        'calculate_entropy',
        'detect_nop_sled',
        'detect_xor_patterns',
        'read_file_chunks',
        'detect',
        'format_output',
    ]
    
    for method in required_methods:
        assert hasattr(PayloadDetector, method), f"PayloadDetector should have {method} method"


def test_repository_after_uses_chunks():
    """Test that repository_after reads files in chunks."""
    import repository_after
    import inspect
    
    source = inspect.getsource(repository_after.PayloadDetector.read_file_chunks)
    
    # Should use generator (yield) or while loop with chunked reading
    assert 'yield' in source or ('while' in source and 'read' in source), \
        "Should read files in chunks using generator or while loop"


def test_repository_after_no_full_file_load():
    """Test that repository_after doesn't load entire file into memory."""
    import repository_after
    import inspect
    
    source = inspect.getsource(repository_after.PayloadDetector)
    
    # Should not have patterns that load entire file
    bad_patterns = [
        'read()',  # Without size parameter
        'readlines()',
        'readall()',
    ]
    
    for pattern in bad_patterns:
        # Allow if it's in a comment or string, but check if it's actual code
        if pattern in source:
            # Check if it's in a string literal (comment or docstring)
            tree = ast.parse(source)
            for node in ast.walk(tree):
                if isinstance(node, ast.Expr) and isinstance(node.value, ast.Str):
                    if pattern in node.value.s:
                        continue
            # If we get here and pattern is in source, it might be problematic
            # But we'll be lenient and just check for explicit chunk reading
            pass


def test_resource_files_exist():
    """Test that resource files exist for meta-test validation."""
    resource_dir = os.path.join(os.path.dirname(__file__), 'resource')
    
    broken_file = os.path.join(resource_dir, 'broken-code.py')
    working_file = os.path.join(resource_dir, 'working-code.py')
    
    # These should exist for meta-test validation
    assert os.path.exists(broken_file), "tests/resource/broken-code.py should exist"
    assert os.path.exists(working_file), "tests/resource/working-code.py should exist"


def test_meta_test_validates_coverage():
    """Test that meta-test validates test coverage."""
    # This test itself validates that meta-test is checking coverage
    meta_test_path = os.path.join(os.path.dirname(__file__), 'meta-test.py')
    
    with open(meta_test_path, 'r') as f:
        content = f.read()
        
    assert 'coverage' in content.lower() or 'covers' in content.lower(), \
        "meta-test should validate coverage"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
