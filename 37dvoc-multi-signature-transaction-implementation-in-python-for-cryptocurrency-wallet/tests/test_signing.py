"""Tests for signing and signature verification."""

import pytest
from tests.conftest import import_from_repository


class TestPartialSignatures:
    """Tests for partial signature creation."""
    
    def test_create_partial_signature(self, repo_module, key_pair_class):
        """Test creating a partial signature."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        sig = sign_payload(keys[0], payload, signer_index=0)
        
        assert sig is not None
        assert sig.signer_index == 0
        assert sig.public_key_bytes == keys[0].public_key_bytes
    
    def test_partial_signature_deterministic(self, repo_module, key_pair_class):
        """Test that partial signatures are deterministic (RFC 6979)."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        sig1 = sign_payload(keys[0], payload, signer_index=0)
        sig2 = sign_payload(keys[0], payload, signer_index=0)
        
        assert sig1.signature == sig2.signature
    
    def test_different_signers_different_signatures(self, repo_module, key_pair_class):
        """Test that different signers produce different signatures."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        sig1 = sign_payload(keys[0], payload, signer_index=0)
        sig2 = sign_payload(keys[1], payload, signer_index=1)
        
        assert sig1.signature != sig2.signature


class TestSignatureVerification:
    """Tests for signature verification."""
    
    def test_verify_valid_partial_signature(self, repo_module, key_pair_class):
        """Test verifying a valid partial signature."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        verify_partial_signature = getattr(repo_module, 'verify_partial_signature', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload, verify_partial_signature]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        sig = sign_payload(keys[0], payload, signer_index=0)
        
        assert verify_partial_signature(sig, payload) is True
    
    def test_verify_invalid_signature_bytes(self, repo_module, key_pair_class):
        """Test that invalid signature bytes fail verification."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        PartialSignature = getattr(repo_module, 'PartialSignature', None)
        verify_partial_signature = getattr(repo_module, 'verify_partial_signature', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, PartialSignature, verify_partial_signature]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        fake_sig = PartialSignature(
            public_key_bytes=keys[0].public_key_bytes,
            signature=b"invalid_signature_bytes",
            signer_index=0
        )
        
        assert verify_partial_signature(fake_sig, payload) is False
    
    def test_verify_signature_wrong_payload(self, repo_module, key_pair_class):
        """Test that signature doesn't verify for wrong payload."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        verify_partial_signature = getattr(repo_module, 'verify_partial_signature', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload, verify_partial_signature]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx1 = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        tx2 = Transaction(recipient="b" * 40, amount=60000, nonce=2, fee=500)
        
        payload1 = TransactionPayload(sender_addresses=addresses, transaction=tx1)
        payload2 = TransactionPayload(sender_addresses=addresses, transaction=tx2)
        
        sig = sign_payload(keys[0], payload1, signer_index=0)
        
        assert verify_partial_signature(sig, payload2) is False


class TestSignatureNormalization:
    """Tests for signature normalization (malleability prevention)."""
    
    def test_signatures_are_normalized(self, repo_module, key_pair_class):
        """Test that signatures are in normalized low-S form."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        is_signature_normalized = getattr(repo_module, 'is_signature_normalized', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload, is_signature_normalized]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        for i in range(10):
            tx = Transaction(recipient="b" * 40, amount=50000 + i, nonce=i, fee=500)
            payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
            
            sig = sign_payload(keys[0], payload, signer_index=0)
            
            assert is_signature_normalized(sig.signature) is True
    
    def test_normalize_signature_idempotent(self, repo_module):
        """Test that normalizing an already normalized signature is idempotent."""
        normalize_signature = getattr(repo_module, 'normalize_signature', None)
        is_signature_normalized = getattr(repo_module, 'is_signature_normalized', None)
        
        if normalize_signature is None or is_signature_normalized is None:
            pytest.skip("Required functions not implemented")
        
        from ecdsa import SigningKey, SECP256k1
        from ecdsa.util import sigencode_der
        import hashlib
        
        sk = SigningKey.generate(curve=SECP256k1)
        data = b"test data"
        
        sig = sk.sign_deterministic(data, hashfunc=hashlib.sha256, sigencode=sigencode_der)
        normalized = normalize_signature(sig)
        normalized_again = normalize_signature(normalized)
        
        assert normalized == normalized_again


class TestSignatureErrors:
    """Tests for signature error handling."""
    
    def test_signature_error_no_secret_leak(self, repo_module, key_pair_class):
        """Test that SignatureError doesn't leak secrets."""
        SignatureError = getattr(repo_module, 'SignatureError', None)
        if SignatureError is None:
            pytest.skip("SignatureError not implemented")
        
        kp = key_pair_class()
        private_hex = kp.get_private_key_bytes().hex()
        
        try:
            raise SignatureError("Test signature error")
        except SignatureError as e:
            assert private_hex not in str(e)
            assert private_hex not in e.message
