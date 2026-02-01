import pytest
import re
import ast
import hashlib
from repository_after import cryptographic_transform

def test_function_signature():
    """Verify function name and exactly one argument."""
    import inspect
    sig = inspect.signature(cryptographic_transform)
    assert len(sig.parameters) == 1, "Function must accept exactly one argument"

def test_input_type_enforcement():
    """Verify function only accepts bytes."""
    with pytest.raises(TypeError):
        cryptographic_transform("string input")
    with pytest.raises(TypeError):
        cryptographic_transform(123)
    with pytest.raises(TypeError):
        cryptographic_transform(None)

def test_output_format():
    """Verify output is a lowercase hex string of 64 characters with no prefix."""
    result = cryptographic_transform(b"test")
    assert isinstance(result, str), "Output must be a string"
    assert len(result) == 64, f"Output length must be 64, got {len(result)}"
    assert re.fullmatch(r"[0-9a-f]{64}", result), "Output must be lowercase hexadecimal"

@pytest.mark.parametrize("input_data,expected_digest_hex", [
    (b"", "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a"),
    (b"abc", "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532"),
    (b"message digest", "edcdb2069366e75243860c18c3a11465eca34bce6143d30c8665cefcfd32bffd"),
    (b"abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu", 
     "916f6061fe879741ca6469b43971dfdb28b1a32dc36cb3254e812be27aad1d18"),
])
def test_cryptographic_functionality(input_data, expected_digest_hex):
    """Verify result matches (SHA3-256(input) XOR 0xA5) in hex."""
    digest_bytes = bytes.fromhex(expected_digest_hex)
    expected_hex = bytes([b ^ 0xA5 for b in digest_bytes]).hex()
    
    actual_hex = cryptographic_transform(input_data)
    assert actual_hex == expected_hex, f"Failed for input {input_data!r}"

def test_determinism():
    """Verify the function is deterministic."""
    data = b"deterministic test"
    res1 = cryptographic_transform(data)
    res2 = cryptographic_transform(data)
    assert res1 == res2, "Function output is not deterministic"

def test_no_side_effects():
    """Verify the function doesn't modify its input."""
    original = bytearray(b"input")
    data = bytes(original)
    cryptographic_transform(data)
    assert data == original, "Function modified the input bytes"

def test_constraint_no_forbidden_sequences():
    """Verify the source code does not contain 'import' or 'hashlib'."""
    import os
    file_path = "repository_after/implementation.py"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "import" not in content, "Sequence 'import' is forbidden in the response."
    assert "hashlib" not in content, "Sequence 'hashlib' is forbidden in the response."

def test_constraint_no_sha_hash_calls():
    """Verify no function/method with 'sha' or 'hash' in the name is called."""
    import os
    file_path = "repository_after/implementation.py"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    tree = ast.parse(content)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                name = node.func.id.lower()
                assert "sha" not in name, f"Forbidden function call: {node.func.id}"
                assert "hash" not in name, f"Forbidden function call: {node.func.id}"
            elif isinstance(node.func, ast.Attribute):
                name = node.func.attr.lower()
                assert "sha" not in name, f"Forbidden method call: {node.func.attr}"
                assert "hash" not in name, f"Forbidden method call: {node.func.attr}"

def test_no_external_dependencies_or_dynamic_exec():
    """Verify no exec, eval, or reflection is used."""
    import os
    file_path = "repository_after/implementation.py"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "exec(" not in content, "Dynamic execution (exec) is forbidden"
    assert "eval(" not in content, "Dynamic execution (eval) is forbidden"
    
    tree = ast.parse(content)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                assert node.func.id not in ["getattr", "setattr", "hasattr", "delattr"], f"Reflection ({node.func.id}) is forbidden"

def test_performance_basic():
    """Verify the function can handle a slightly larger input (1MB) efficiently."""
    import time
    data = b"x" * (1024 * 1024)
    start = time.time()
    cryptographic_transform(data)
    elapsed = time.time() - start
    # SHA3-256 on 1MB should be fast even in pure Python (usually < 1s)
    assert elapsed < 10, f"Performance issue: 1MB took {elapsed:.2f}s"
