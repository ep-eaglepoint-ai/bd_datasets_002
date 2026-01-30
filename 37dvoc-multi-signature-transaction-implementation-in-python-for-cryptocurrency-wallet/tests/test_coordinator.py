"""Tests for coordinator module."""

import pytest
from tests.conftest import import_from_repository


class TestCoordinatorInitialization:
    """Tests for coordinator initialization."""
    
    def test_coordinator_creation(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test creating a coordinator."""
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
        
        assert coordinator.get_signature_count() == 0
        assert not coordinator.is_threshold_met()
    
    def test_coordinator_requires_three_keys(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that coordinator requires exactly 3 authorized keys."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        ValidationError = getattr(repo_module, 'ValidationError', None)
        if any(c is None for c in [Transaction, TransactionPayload, ValidationError]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        with pytest.raises(ValidationError):
            signature_coordinator_class(payload, [keys[0].public_key_bytes])


class TestSignatureCollection:
    """Tests for signature collection and verification."""
    
    def test_add_valid_signature(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test adding a valid signature."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        sig = sign_payload(keys[0], payload, 0)
        result = coordinator.add_signature(sig)
        
        assert result is True
        assert coordinator.get_signature_count() == 1
    
    def test_reject_duplicate_signature(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that duplicate signatures from same key are rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        sig = sign_payload(keys[0], payload, 0)
        coordinator.add_signature(sig)
        
        result = coordinator.add_signature(sig)
        assert result is False
        assert coordinator.get_signature_count() == 1
    
    def test_reject_unauthorized_signature(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that signatures from unauthorized keys are rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        SignatureError = getattr(repo_module, 'SignatureError', None)
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload, SignatureError]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        unauthorized_key = key_pair_class()
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        sig = sign_payload(unauthorized_key, payload, 0)
        
        with pytest.raises(SignatureError):
            coordinator.add_signature(sig)
    
    def test_reject_invalid_signature(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that invalid signatures are rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        PartialSignature = getattr(repo_module, 'PartialSignature', None)
        SignatureError = getattr(repo_module, 'SignatureError', None)
        if any(c is None for c in [Transaction, TransactionPayload, PartialSignature, SignatureError]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        fake_sig = PartialSignature(
            public_key_bytes=keys[0].public_key_bytes,
            signature=b"invalid_signature",
            signer_index=0
        )
        
        with pytest.raises(SignatureError):
            coordinator.add_signature(fake_sig)


class TestThresholdEnforcement:
    """Tests for threshold enforcement."""
    
    def test_threshold_not_met_with_one_signature(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that threshold is not met with only one signature."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx, threshold=2)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        sig = sign_payload(keys[0], payload, 0)
        coordinator.add_signature(sig)
        
        assert not coordinator.is_threshold_met()
        assert coordinator.get_missing_signer_count() == 1
    
    def test_threshold_met_with_two_signatures(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that threshold is met with two signatures."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx, threshold=2)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        sig1 = sign_payload(keys[0], payload, 0)
        sig2 = sign_payload(keys[1], payload, 1)
        
        coordinator.add_signature(sig1)
        coordinator.add_signature(sig2)
        
        assert coordinator.is_threshold_met()
        assert coordinator.get_missing_signer_count() == 0
    
    def test_get_signed_transaction_fails_without_threshold(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that getting signed transaction fails if threshold not met."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        ThresholdNotMetError = getattr(repo_module, 'ThresholdNotMetError', None)
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload, ThresholdNotMetError]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx, threshold=2)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        sig = sign_payload(keys[0], payload, 0)
        coordinator.add_signature(sig)
        
        with pytest.raises(ThresholdNotMetError):
            coordinator.get_signed_transaction()
    
    def test_get_signed_transaction_succeeds_with_threshold(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that getting signed transaction succeeds when threshold is met."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx, threshold=2)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        sig1 = sign_payload(keys[0], payload, 0)
        sig2 = sign_payload(keys[1], payload, 1)
        
        coordinator.add_signature(sig1)
        coordinator.add_signature(sig2)
        
        signed_tx = coordinator.get_signed_transaction()
        
        assert signed_tx is not None
        assert len(signed_tx.signatures) == 2


class TestCoordinatorReset:
    """Tests for coordinator reset functionality."""
    
    def test_reset_clears_signatures(self, signature_coordinator_class, repo_module, key_pair_class):
        """Test that reset clears all collected signatures."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if any(c is None for c in [Transaction, TransactionPayload, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        auth_keys = [k.public_key_bytes for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        coordinator = signature_coordinator_class(payload, auth_keys)
        
        sig = sign_payload(keys[0], payload, 0)
        coordinator.add_signature(sig)
        
        assert coordinator.get_signature_count() == 1
        
        coordinator.reset()
        
        assert coordinator.get_signature_count() == 0
