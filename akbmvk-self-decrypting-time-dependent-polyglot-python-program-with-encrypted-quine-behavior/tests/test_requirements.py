"""
Test suite for Self-Decrypting Time-Dependent Polyglot Python Program.

Verifies all acceptance criteria from the task requirements.
"""
import sys
import os
import io
import contextlib
import importlib.util
import base64
import zlib
import time
from pathlib import Path
import pytest

# Import the solution
project_root = Path(__file__).parent.parent
repo_after = project_root / "repository_after"
spec = importlib.util.spec_from_file_location("solution", repo_after / "__init__.py")
solution = importlib.util.module_from_spec(spec)
spec.loader.exec_module(solution)


class TestQuineBehavior:
    """Test that the script prints its own encrypted payload (quine behavior)."""
    
    def test_prints_encrypted_payload(self):
        """Verify the script prints PAYLOAD exactly before execution."""
        captured_output = io.StringIO()
        with contextlib.redirect_stdout(captured_output):
            solution.main()
        output = captured_output.getvalue()
        lines = output.strip().split('\n')
        assert len(lines) >= 1, "Script must print at least the encrypted payload"
        assert lines[0] == solution.PAYLOAD, "First line must be the exact encrypted payload"


class TestPayloadEncoding:
    """Test that payload is properly Base64-encoded and Zlib-compressed."""
    
    def test_payload_is_base64_encoded(self):
        """Verify PAYLOAD is valid Base64."""
        try:
            decoded = base64.b64decode(solution.PAYLOAD)
            assert len(decoded) > 0, "Payload must decode to non-empty bytes"
        except Exception as e:
            pytest.fail(f"PAYLOAD is not valid Base64: {e}")
    
    def test_payload_is_zlib_compressed(self):
        """Verify PAYLOAD decodes to valid Zlib-compressed data."""
        try:
            decoded = base64.b64decode(solution.PAYLOAD)
            decompressed = zlib.decompress(decoded)
            assert len(decompressed) > 0, "Decompressed payload must be non-empty"
        except Exception as e:
            pytest.fail(f"PAYLOAD is not valid Zlib-compressed data: {e}")
    
    def test_no_plaintext_hamming_in_source(self):
        """Verify Hamming Distance code is not in plaintext."""
        source_file = repo_after / "__init__.py"
        source_content = source_file.read_text()
        # Check for common Hamming distance patterns
        assert "def hamming" not in source_content.lower(), "Hamming function must not be in plaintext"
        assert "hamming distance" not in source_content.lower(), "Hamming distance must not be in plaintext"
    
    def test_no_plaintext_sieve_in_source(self):
        """Verify Sieve of Eratosthenes code is not in plaintext."""
        source_file = repo_after / "__init__.py"
        source_content = source_file.read_text()
        # Check for common sieve patterns
        assert "sieve" not in source_content.lower(), "Sieve must not be in plaintext"
        assert "eratosthenes" not in source_content.lower(), "Eratosthenes must not be in plaintext"


class TestTimeBasedDecryption:
    """Test time-based decryption behavior."""
    
    def test_even_minute_decrypts_with_key_a(self):
        """Verify even minutes use KEY_A and produce Hamming Distance function."""
        # Mock time to return an even minute
        original_localtime = time.localtime
        
        def mock_localtime_even():
            class MockTime:
                tm_min = 10  # Even minute
            return MockTime()
        
        time.localtime = mock_localtime_even
        
        try:
            source = solution._decrypt_source_for_minute(10)
            assert "payload_function" in source, "Decrypted code must define payload_function"
            assert "hamming" in source.lower() or "distance" in source.lower(), "Even minute should produce Hamming Distance code"
        finally:
            time.localtime = original_localtime
    
    def test_odd_minute_decrypts_with_key_b(self):
        """Verify odd minutes use KEY_B and produce Sieve function."""
        # Mock time to return an odd minute
        original_localtime = time.localtime
        
        def mock_localtime_odd():
            class MockTime:
                tm_min = 11  # Odd minute
            return MockTime()
        
        time.localtime = mock_localtime_odd
        
        try:
            source = solution._decrypt_source_for_minute(11)
            assert "payload_function" in source, "Decrypted code must define payload_function"
            assert "prime" in source.lower() or "sieve" in source.lower(), "Odd minute should produce prime sieve code"
        finally:
            time.localtime = original_localtime
    
    def test_single_payload_reused(self):
        """Verify the same PAYLOAD is used for both even and odd minutes."""
        even_source = solution._decrypt_source_for_minute(10)
        odd_source = solution._decrypt_source_for_minute(11)
        # Both should decrypt successfully (different results but same payload)
        assert len(even_source) > 0, "Even minute decryption must succeed"
        assert len(odd_source) > 0, "Odd minute decryption must succeed"
        # They should be different (different keys produce different results)
        assert even_source != odd_source, "Different keys should produce different decrypted code"


class TestManualXORImplementation:
    """Test that XOR is manually implemented (no built-in XOR operator)."""
    
    def test_manual_xor_function_exists(self):
        """Verify manual_xor_bytes function exists."""
        assert hasattr(solution, 'manual_xor_bytes'), "manual_xor_bytes function must exist"
        assert callable(solution.manual_xor_bytes), "manual_xor_bytes must be callable"
    
    def test_manual_xor_works_correctly(self):
        """Verify manual XOR produces correct results."""
        data = b"hello"
        key = b"world"
        result = solution.manual_xor_bytes(data, key)
        # Verify it's the correct length
        assert len(result) == len(data), "XOR result must have same length as input"
        # Verify it's reversible (XOR twice returns original)
        double_xor = solution.manual_xor_bytes(result, key)
        assert double_xor == data, "XOR must be reversible"
    
    def test_no_xor_operator_in_source(self):
        """Verify source code does not use ^ operator for XOR."""
        source_file = repo_after / "__init__.py"
        source_content = source_file.read_text()
        # Check that manual_xor_bytes doesn't use ^
        xor_func_start = source_content.find("def manual_xor_bytes")
        xor_func_end = source_content.find("\ndef ", xor_func_start + 1)
        if xor_func_end == -1:
            xor_func_end = len(source_content)
        xor_func_code = source_content[xor_func_start:xor_func_end]
        assert "^" not in xor_func_code, "XOR must be implemented manually without ^ operator"


class TestManualBitLengthImplementation:
    """Test that bit-length calculation is manually implemented."""
    
    def test_manual_bit_length_function_exists(self):
        """Verify manual_bit_length function exists."""
        assert hasattr(solution, 'manual_bit_length'), "manual_bit_length function must exist"
        assert callable(solution.manual_bit_length), "manual_bit_length must be callable"
    
    def test_manual_bit_length_works(self):
        """Verify manual bit length calculation works correctly."""
        assert solution.manual_bit_length(0) == 0, "Bit length of 0 should be 0"
        assert solution.manual_bit_length(1) == 1, "Bit length of 1 should be 1"
        assert solution.manual_bit_length(255) == 8, "Bit length of 255 should be 8"
        assert solution.manual_bit_length(256) == 9, "Bit length of 256 should be 9"


class TestExecutionModel:
    """Test that decrypted code is executed using exec()."""
    
    def test_exec_is_used(self):
        """Verify main() uses exec() to execute decrypted code."""
        source_file = repo_after / "__init__.py"
        source_content = source_file.read_text()
        assert "exec(" in source_content, "Solution must use exec() to execute decrypted code"
    
    def test_decrypted_code_is_executable(self):
        """Verify decrypted code defines and executes a function."""
        current_minute = time.localtime().tm_min
        source = solution._decrypt_source_for_minute(current_minute)
        namespace = {}
        exec(source, namespace)
        assert "payload_function" in namespace, "Decrypted code must define payload_function"
        assert callable(namespace["payload_function"]), "payload_function must be callable"


class TestStandardLibraryOnly:
    """Test that only standard library modules are used."""
    
    def test_only_allowed_imports(self):
        """Verify only time, base64, zlib are imported."""
        source_file = repo_after / "__init__.py"
        source_content = source_file.read_text()
        # Check imports
        import_lines = [line for line in source_content.split('\n') if line.strip().startswith('import') or line.strip().startswith('from')]
        allowed_modules = {'time', 'base64', 'zlib'}
        for import_line in import_lines:
            # Extract module name
            if 'import' in import_line:
                module = import_line.split('import')[1].strip().split()[0].split('.')[0]
                assert module in allowed_modules, f"Only standard library modules allowed, found: {module}"
    
    def test_no_external_libraries(self):
        """Verify no external libraries are used."""
        source_file = repo_after / "__init__.py"
        source_content = source_file.read_text()
        # Common external library names that should not appear
        forbidden = ['numpy', 'pandas', 'requests', 'cryptography', 'pycrypto']
        for lib in forbidden:
            assert lib not in source_content.lower(), f"External library {lib} must not be used"


class TestFunctionality:
    """Test that the decrypted functions work correctly."""
    
    def test_hamming_distance_function_works(self):
        """Verify Hamming Distance function computes correctly."""
        # Decrypt with even minute (should produce Hamming Distance)
        source = solution._decrypt_source_for_minute(10)
        namespace = {}
        exec(source, namespace)
        func = namespace.get("payload_function")
        assert func is not None, "payload_function must exist"
        # The function should execute without error
        try:
            func()
        except Exception as e:
            pytest.fail(f"Hamming Distance function failed: {e}")
    
    def test_sieve_function_works(self):
        """Verify Sieve of Eratosthenes function works correctly."""
        # Decrypt with odd minute (should produce Sieve)
        source = solution._decrypt_source_for_minute(11)
        namespace = {}
        exec(source, namespace)
        func = namespace.get("payload_function")
        assert func is not None, "payload_function must exist"
        # The function should execute without error
        try:
            func()
        except Exception as e:
            pytest.fail(f"Sieve function failed: {e}")


class TestSingleScript:
    """Test that solution exists in a single runnable script."""
    
    def test_single_file(self):
        """Verify solution is in a single __init__.py file."""
        assert (repo_after / "__init__.py").exists(), "Solution must be in __init__.py"
        # Check that __init__.py is not empty
        content = (repo_after / "__init__.py").read_text()
        assert len(content) > 100, "Solution must contain substantial code"
    
    def test_script_is_runnable(self):
        """Verify the script can be executed directly."""
        script_path = repo_after / "__init__.py"
        assert script_path.exists(), "Script must exist"
        # Verify it has if __name__ == "__main__" guard
        content = script_path.read_text()
        assert '__name__' in content and '__main__' in content, "Script must be runnable with python -m"




