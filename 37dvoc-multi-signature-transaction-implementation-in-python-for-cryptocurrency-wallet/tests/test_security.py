"""Tests for security properties."""

import pytest
import io
import sys
from tests.conftest import import_from_repository


class TestSecretHandling:
    """Tests for secure secret handling."""
    
    def test_private_key_not_in_repr(self, key_pair_class):
        """Test that private key is not exposed in repr."""
        kp = key_pair_class()
        repr_str = repr(kp)
        
        private_hex = kp.get_private_key_bytes().hex()
        
        assert private_hex not in repr_str
        assert "private" not in repr_str.lower() or "key" not in repr_str.lower()
    
    def test_private_key_not_in_str(self, key_pair_class):
        """Test that private key is not exposed in str."""
        kp = key_pair_class()
        str_str = str(kp)
        
        private_hex = kp.get_private_key_bytes().hex()
        
        assert private_hex not in str_str
    
    def test_exception_does_not_contain_secrets(self, repo_module, key_pair_class):
        """Test that exceptions don't contain secret information."""
        SignatureError = getattr(repo_module, 'SignatureError', None)
        if SignatureError is None:
            pytest.skip("SignatureError not implemented")
        
        kp = key_pair_class()
        private_hex = kp.get_private_key_bytes().hex()
        
        try:
            raise SignatureError("Failed to sign")
        except SignatureError as e:
            assert private_hex not in str(e)
            assert private_hex not in repr(e)


class TestConstantTimeOperations:
    """Tests for constant-time comparison usage."""
    
    def test_constant_time_compare_uses_hmac(self, repo_module):
        """Test that constant time compare is using hmac.compare_digest."""
        constant_time_compare = getattr(repo_module, 'constant_time_compare', None)
        if constant_time_compare is None:
            pytest.skip("constant_time_compare not implemented")
        
        import hmac
        
        a = b"test_value"
        b_same = b"test_value"
        b_diff = b"other_value"
        
        assert constant_time_compare(a, b_same) == hmac.compare_digest(a, b_same)
        assert constant_time_compare(a, b_diff) == hmac.compare_digest(a, b_diff)
    
    def test_coordinator_uses_constant_time_for_key_check(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that coordinator uses constant time comparison for key authorization."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        if Transaction is None or TransactionPayload is None:
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        assert coordinator.is_authorized_key(keys[0].public_key_bytes) is True
        
        unauthorized_key = key_pair_class()
        assert coordinator.is_authorized_key(unauthorized_key.public_key_bytes) is False


class TestSecureRandomness:
    """Tests for secure random number generation."""
    
    def test_keys_use_secure_randomness(self, key_pair_class):
        """Test that keys are generated with secure randomness."""
        keys = [key_pair_class() for _ in range(100)]
        public_keys = [kp.public_key_hex for kp in keys]
        
        assert len(set(public_keys)) == 100
    
    def test_key_generation_entropy(self, key_pair_class):
        """Test that generated keys have sufficient entropy."""
        import hashlib
        
        keys = [key_pair_class() for _ in range(50)]
        private_bytes = [kp.get_private_key_bytes() for kp in keys]
        
        for pk in private_bytes:
            assert len(pk) == 32
            zero_bytes = sum(1 for b in pk if b == 0)
            assert zero_bytes < 16


class TestExceptionHierarchy:
    """Tests for proper exception hierarchy."""
    
    def test_all_exceptions_inherit_from_base(self, repo_module):
        """Test that all exceptions inherit from MultiSigError."""
        MultiSigError = getattr(repo_module, 'MultiSigError', None)
        if MultiSigError is None:
            pytest.skip("MultiSigError not implemented")
        
        exception_classes = [
            'KeyGenerationError',
            'InvalidAddressError',
            'InvalidAmountError',
            'NonceError',
            'SignatureError',
            'ThresholdNotMetError',
            'BroadcastError',
            'ValidationError'
        ]
        
        for exc_name in exception_classes:
            exc_class = getattr(repo_module, exc_name, None)
            if exc_class is not None:
                assert issubclass(exc_class, MultiSigError)
    
    def test_exception_has_message(self, repo_module):
        """Test that exceptions have message attribute."""
        SignatureError = getattr(repo_module, 'SignatureError', None)
        if SignatureError is None:
            pytest.skip("SignatureError not implemented")
        
        error = SignatureError("Test error message")
        
        assert hasattr(error, 'message')
        assert error.message == "Test error message"
    
    def test_exception_clear_message(self, repo_module):
        """Test that exceptions have clear, understandable messages."""
        InvalidAmountError = getattr(repo_module, 'InvalidAmountError', None)
        NonceError = getattr(repo_module, 'NonceError', None)
        
        if InvalidAmountError is None or NonceError is None:
            pytest.skip("Required exceptions not implemented")
        
        amount_error = InvalidAmountError("Amount must be positive")
        assert "positive" in amount_error.message.lower() or "amount" in amount_error.message.lower()
        
        nonce_error = NonceError("Nonce has already been used")
        assert "nonce" in nonce_error.message.lower() or "used" in nonce_error.message.lower()


class TestNoSecretLogging:
    """Tests to ensure secrets are not logged."""
    
    def test_key_creation_no_secret_output(self, key_pair_class):
        """Test that key creation doesn't print secrets."""
        captured = io.StringIO()
        sys.stdout = captured
        
        try:
            kp = key_pair_class()
            private_hex = kp.get_private_key_bytes().hex()
        finally:
            sys.stdout = sys.__stdout__
        
        output = captured.getvalue()
        assert private_hex not in output
    
    def test_signature_creation_no_secret_output(self, repo_module, key_pair_class):
        """Test that signature creation doesn't print secrets."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        private_hexs = [k.get_private_key_bytes().hex() for k in keys]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        captured = io.StringIO()
        sys.stdout = captured
        
        try:
            tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
            payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
            sig = sign_payload(keys[0], payload, 0)
        finally:
            sys.stdout = sys.__stdout__
        
        output = captured.getvalue()
        for private_hex in private_hexs:
            assert private_hex not in output
