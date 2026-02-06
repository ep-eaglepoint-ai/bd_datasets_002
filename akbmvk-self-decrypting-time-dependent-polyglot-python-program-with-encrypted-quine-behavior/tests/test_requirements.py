"""
Test suite for Self-Decrypting Time-Dependent Polyglot Python Program.

Verifies all acceptance criteria from the task requirements
using the refactored, import-safe architecture.
"""

import io
import contextlib
import importlib.util
import base64
import zlib
import time
from pathlib import Path
import pytest

# ---------------------------------------------------------------------
# Load solution from runner.py (explicit execution model)
# ---------------------------------------------------------------------

project_root = Path(__file__).parent.parent
repo_after = project_root / "repository_after"
runner_path = repo_after / "runner.py"

spec = importlib.util.spec_from_file_location("solution", runner_path)
solution = importlib.util.module_from_spec(spec)
spec.loader.exec_module(solution)


# ---------------------------------------------------------------------
# Quine behavior
# ---------------------------------------------------------------------

class TestQuineBehavior:
    """Test that the script prints its own encrypted payload."""

    def test_prints_encrypted_payload(self):
        captured_output = io.StringIO()
        with contextlib.redirect_stdout(captured_output):
            solution.run_payload(minute=10)

        output = captured_output.getvalue()
        lines = output.strip().split("\n")

        assert len(lines) >= 1
        assert lines[0] == solution.PAYLOAD


# ---------------------------------------------------------------------
# Payload encoding
# ---------------------------------------------------------------------

class TestPayloadEncoding:
    """Test payload encoding properties."""

    def test_payload_is_base64_encoded(self):
        decoded = base64.b64decode(solution.PAYLOAD)
        assert len(decoded) > 0

    def test_payload_is_zlib_compressed(self):
        decoded = base64.b64decode(solution.PAYLOAD)
        decompressed = zlib.decompress(decoded)
        assert len(decompressed) > 0

    def test_no_plaintext_hamming_in_source(self):
        source = runner_path.read_text().lower()
        assert "hamming" not in source
        assert "distance" not in source

    def test_no_plaintext_sieve_in_source(self):
        source = runner_path.read_text().lower()
        assert "sieve" not in source
        assert "eratosthenes" not in source


# ---------------------------------------------------------------------
# Time-based decryption
# ---------------------------------------------------------------------

class TestTimeBasedDecryption:
    """Verify correct key selection by minute."""

    def test_even_minute_decrypts_hamming(self):
        source = solution._decrypt_source_for_minute(10)
        assert "payload_function" in source
        assert "hamming" in source.lower() or "distance" in source.lower()

    def test_odd_minute_decrypts_sieve(self):
        source = solution._decrypt_source_for_minute(11)
        assert "payload_function" in source
        assert "prime" in source.lower() or "sieve" in source.lower()

    def test_single_payload_reused(self):
        even = solution._decrypt_source_for_minute(10)
        odd = solution._decrypt_source_for_minute(11)
        assert even != odd
        assert len(even) > 0
        assert len(odd) > 0


# ---------------------------------------------------------------------
# Manual XOR implementation
# ---------------------------------------------------------------------

class TestManualXORImplementation:
    """Verify XOR is implemented manually."""

    def test_manual_xor_function_exists(self):
        assert callable(solution.manual_xor_bytes)

    def test_manual_xor_reversible(self):
        data = b"hello"
        key = b"world"
        enc = solution.manual_xor_bytes(data, key)
        dec = solution.manual_xor_bytes(enc, key)
        assert dec == data

    def test_no_xor_operator_used(self):
        source = runner_path.read_text()
        start = source.find("def manual_xor_bytes")
        end = source.find("\ndef ", start + 1)
        if end == -1:
            end = len(source)
        xor_func = source[start:end]
        assert "^" not in xor_func


# ---------------------------------------------------------------------
# Manual bit-length implementation
# ---------------------------------------------------------------------

class TestManualBitLengthImplementation:
    """Verify bit-length is calculated manually."""

    def test_manual_bit_length_exists(self):
        assert callable(solution.manual_bit_length)

    def test_manual_bit_length_correctness(self):
        assert solution.manual_bit_length(0) == 0
        assert solution.manual_bit_length(1) == 1
        assert solution.manual_bit_length(255) == 8
        assert solution.manual_bit_length(256) == 9


# ---------------------------------------------------------------------
# Execution model
# ---------------------------------------------------------------------

class TestExecutionModel:
    """Verify decrypted code execution model."""

    def test_exec_is_used(self):
        source = runner_path.read_text()
        assert "exec(" in source

    def test_decrypted_code_is_executable(self):
        source = solution._decrypt_source_for_minute(10)
        namespace = {}
        exec(source, namespace)
        assert "payload_function" in namespace
        assert callable(namespace["payload_function"])


# ---------------------------------------------------------------------
# Standard library only
# ---------------------------------------------------------------------

class TestStandardLibraryOnly:
    """Ensure only standard library is used."""

    def test_only_allowed_imports(self):
        source = runner_path.read_text()
        import_lines = [
            line for line in source.splitlines()
            if line.strip().startswith(("import ", "from "))
        ]

        allowed = {"time", "base64", "zlib"}

        for line in import_lines:
            module = line.split()[1].split(".")[0]
            assert module in allowed

    def test_no_external_libraries(self):
        source = runner_path.read_text().lower()
        forbidden = ["numpy", "pandas", "requests", "cryptography", "pycrypto"]
        for lib in forbidden:
            assert lib not in source


# ---------------------------------------------------------------------
# Payload functionality
# ---------------------------------------------------------------------

class TestFunctionality:
    """Verify decrypted payloads execute correctly."""

    def test_hamming_function_executes(self):
        source = solution._decrypt_source_for_minute(10)
        ns = {}
        exec(source, ns)
        func = ns["payload_function"]
        func()

    def test_sieve_function_executes(self):
        source = solution._decrypt_source_for_minute(11)
        ns = {}
        exec(source, ns)
        func = ns["payload_function"]
        func()


# ---------------------------------------------------------------------
# Entry point validation
# ---------------------------------------------------------------------

class TestEntryPoint:
    """Verify explicit execution entry point exists."""

    def test_runner_exists(self):
        assert runner_path.exists()

    def test_module_is_runnable(self):
        main_file = repo_after / "__main__.py"
        assert main_file.exists()
        content = main_file.read_text()
        assert "run_payload" in content
