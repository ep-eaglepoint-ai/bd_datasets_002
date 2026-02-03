"""Tests for transaction data structures."""

import pytest
from tests.conftest import import_from_repository


class TestTransactionValidation:
    """Tests for Transaction input validation."""
    
    def test_valid_transaction_creation(self, repo_module):
        """Test creating a valid transaction."""
        Transaction = getattr(repo_module, 'Transaction', None)
        if Transaction is None:
            pytest.skip("Transaction not implemented")
        
        tx = Transaction(
            recipient="a" * 40,
            amount=100000,
            nonce=0,
            fee=1000
        )
        assert tx.amount == 100000
        assert tx.nonce == 0
        assert tx.fee == 1000
    
    def test_invalid_amount_zero(self, repo_module):
        """Test that zero amount is rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        InvalidAmountError = getattr(repo_module, 'InvalidAmountError', None)
        if Transaction is None or InvalidAmountError is None:
            pytest.skip("Required classes not implemented")
        
        with pytest.raises(InvalidAmountError):
            Transaction(recipient="a" * 40, amount=0, nonce=0, fee=1000)
    
    def test_invalid_amount_negative(self, repo_module):
        """Test that negative amount is rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        InvalidAmountError = getattr(repo_module, 'InvalidAmountError', None)
        if Transaction is None or InvalidAmountError is None:
            pytest.skip("Required classes not implemented")
        
        with pytest.raises(InvalidAmountError):
            Transaction(recipient="a" * 40, amount=-100, nonce=0, fee=1000)
    
    def test_invalid_address_too_short(self, repo_module):
        """Test that short address is rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        InvalidAddressError = getattr(repo_module, 'InvalidAddressError', None)
        if Transaction is None or InvalidAddressError is None:
            pytest.skip("Required classes not implemented")
        
        with pytest.raises(InvalidAddressError):
            Transaction(recipient="abc", amount=100, nonce=0, fee=1000)
    
    def test_invalid_address_non_hex(self, repo_module):
        """Test that non-hex address is rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        InvalidAddressError = getattr(repo_module, 'InvalidAddressError', None)
        if Transaction is None or InvalidAddressError is None:
            pytest.skip("Required classes not implemented")
        
        with pytest.raises(InvalidAddressError):
            Transaction(recipient="g" * 40, amount=100, nonce=0, fee=1000)
    
    def test_invalid_nonce_negative(self, repo_module):
        """Test that negative nonce is rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        NonceError = getattr(repo_module, 'NonceError', None)
        if Transaction is None or NonceError is None:
            pytest.skip("Required classes not implemented")
        
        with pytest.raises(NonceError):
            Transaction(recipient="a" * 40, amount=100, nonce=-1, fee=1000)
    
    def test_invalid_fee_negative(self, repo_module):
        """Test that negative fee is rejected."""
        Transaction = getattr(repo_module, 'Transaction', None)
        InvalidAmountError = getattr(repo_module, 'InvalidAmountError', None)
        if Transaction is None or InvalidAmountError is None:
            pytest.skip("Required classes not implemented")
        
        with pytest.raises(InvalidAmountError):
            Transaction(recipient="a" * 40, amount=100, nonce=0, fee=-1)
    
    def test_address_normalized_to_lowercase(self, repo_module):
        """Test that address is normalized to lowercase."""
        Transaction = getattr(repo_module, 'Transaction', None)
        if Transaction is None:
            pytest.skip("Transaction not implemented")
        
        tx = Transaction(recipient="A" * 40, amount=100, nonce=0, fee=1000)
        assert tx.recipient == "a" * 40


class TestTransactionPayload:
    """Tests for TransactionPayload."""
    
    def test_payload_creation(self, repo_module):
        """Test creating a transaction payload."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        if Transaction is None or TransactionPayload is None:
            pytest.skip("Required classes not implemented")
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        addresses = ["a" * 40, "c" * 40, "d" * 40]
        
        payload = TransactionPayload(
            sender_addresses=addresses,
            transaction=tx,
            threshold=2
        )
        
        assert payload.threshold == 2
        assert len(payload.sender_addresses) == 3
    
    def test_payload_requires_three_addresses(self, repo_module):
        """Test that payload requires exactly 3 sender addresses."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        ValidationError = getattr(repo_module, 'ValidationError', None)
        if any(c is None for c in [Transaction, TransactionPayload, ValidationError]):
            pytest.skip("Required classes not implemented")
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        
        with pytest.raises(ValidationError):
            TransactionPayload(sender_addresses=["a" * 40, "c" * 40], transaction=tx)
    
    def test_payload_hash_deterministic(self, repo_module):
        """Test that payload hash is deterministic."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        if Transaction is None or TransactionPayload is None:
            pytest.skip("Required classes not implemented")
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        addresses = ["a" * 40, "c" * 40, "d" * 40]
        
        payload1 = TransactionPayload(sender_addresses=addresses, transaction=tx)
        payload2 = TransactionPayload(sender_addresses=addresses, transaction=tx)
        
        assert payload1.hash() == payload2.hash()
        assert payload1.hash_hex() == payload2.hash_hex()
    
    def test_payload_hash_different_for_different_data(self, repo_module):
        """Test that different payloads have different hashes."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        if Transaction is None or TransactionPayload is None:
            pytest.skip("Required classes not implemented")
        
        addresses = ["a" * 40, "c" * 40, "d" * 40]
        
        tx1 = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        tx2 = Transaction(recipient="b" * 40, amount=60000, nonce=1, fee=500)
        
        payload1 = TransactionPayload(sender_addresses=addresses, transaction=tx1)
        payload2 = TransactionPayload(sender_addresses=addresses, transaction=tx2)
        
        assert payload1.hash() != payload2.hash()


class TestSignedTransaction:
    """Tests for SignedTransaction."""
    
    def test_signed_transaction_threshold_check(self, repo_module, key_pair_class):
        """Test that signed transaction checks threshold correctly."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        SignedTransaction = getattr(repo_module, 'SignedTransaction', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, SignedTransaction, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx, threshold=2)
        
        sig1 = sign_payload(keys[0], payload, 0)
        signed_tx = SignedTransaction(payload=payload, signatures=[sig1])
        
        assert not signed_tx.is_threshold_met()
        
        sig2 = sign_payload(keys[1], payload, 1)
        signed_tx = SignedTransaction(payload=payload, signatures=[sig1, sig2])
        
        assert signed_tx.is_threshold_met()
    
    def test_broadcast_format(self, repo_module, key_pair_class):
        """Test the broadcast format of signed transaction."""
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        SignedTransaction = getattr(repo_module, 'SignedTransaction', None)
        sign_payload = getattr(repo_module, 'sign_payload', None)
        
        if any(c is None for c in [Transaction, TransactionPayload, SignedTransaction, sign_payload]):
            pytest.skip("Required classes not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        addresses = [k.public_key_hex[:40] for k in keys]
        
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=1, fee=500)
        payload = TransactionPayload(sender_addresses=addresses, transaction=tx, threshold=2)
        
        sig1 = sign_payload(keys[0], payload, 0)
        sig2 = sign_payload(keys[1], payload, 1)
        
        signed_tx = SignedTransaction(payload=payload, signatures=[sig1, sig2])
        broadcast_data = signed_tx.to_broadcast_format()
        
        assert 'payload' in broadcast_data
        assert 'payload_hash' in broadcast_data
        assert 'signatures' in broadcast_data
        assert 'signature_count' in broadcast_data
        assert broadcast_data['signature_count'] == 2
