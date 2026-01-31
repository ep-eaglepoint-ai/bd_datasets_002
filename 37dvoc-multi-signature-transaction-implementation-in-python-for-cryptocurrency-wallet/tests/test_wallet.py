"""Tests for wallet module."""

import pytest
from tests.conftest import import_from_repository


class TestWalletCreation:
    """Tests for wallet creation."""
    
    def test_wallet_creation(self, multi_sig_wallet_class, key_pair_class):
        """Test creating a multi-sig wallet."""
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        
        wallet = multi_sig_wallet_class(public_keys)
        
        assert wallet is not None
        assert wallet.threshold == 2
    
    def test_wallet_requires_three_keys(self, multi_sig_wallet_class, repo_module, key_pair_class):
        """Test that wallet requires exactly 3 public keys."""
        ValidationError = getattr(repo_module, 'ValidationError', None)
        if ValidationError is None:
            pytest.skip("ValidationError not implemented")
        
        keys = [key_pair_class() for _ in range(2)]
        public_keys = [k.public_key for k in keys]
        
        with pytest.raises(ValidationError):
            multi_sig_wallet_class(public_keys)
    
    def test_wallet_addresses(self, multi_sig_wallet_class, key_pair_class):
        """Test that wallet has 3 addresses."""
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        
        wallet = multi_sig_wallet_class(public_keys)
        
        assert len(wallet.addresses) == 3
        for addr in wallet.addresses:
            assert len(addr) == 40


class TestTransactionPayloadCreation:
    """Tests for transaction payload creation."""
    
    def test_create_payload(self, multi_sig_wallet_class, key_pair_class):
        """Test creating a transaction payload."""
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        wallet = multi_sig_wallet_class(public_keys)
        
        payload = wallet.create_transaction_payload(
            recipient="b" * 40,
            amount=50000
        )
        
        assert payload is not None
        assert payload.transaction.amount == 50000
        assert payload.threshold == 2
    
    def test_auto_nonce_generation(self, multi_sig_wallet_class, key_pair_class):
        """Test that nonces are auto-generated."""
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        wallet = multi_sig_wallet_class(public_keys)
        
        payload1 = wallet.create_transaction_payload(recipient="b" * 40, amount=50000)
        payload2 = wallet.create_transaction_payload(recipient="b" * 40, amount=60000)
        
        assert payload1.transaction.nonce != payload2.transaction.nonce
    
    def test_fee_estimation(self, multi_sig_wallet_class, key_pair_class):
        """Test fee estimation."""
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        wallet = multi_sig_wallet_class(public_keys)
        
        fee = wallet.estimate_fee()
        
        assert fee > 0


class TestWalletBroadcast:
    """Tests for transaction broadcast."""
    
    def test_broadcast_success(self, multi_sig_wallet_class, repo_module, key_pair_class):
        """Test successful broadcast."""
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if sign_payload is None:
            pytest.skip("sign_payload not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        wallet = multi_sig_wallet_class(public_keys)
        
        payload = wallet.create_transaction_payload(recipient="b" * 40, amount=50000)
        
        coordinator = wallet.create_coordinator(payload)
        
        sig1 = sign_payload(keys[0], payload, 0)
        sig2 = sign_payload(keys[1], payload, 1)
        
        coordinator.add_signature(sig1)
        coordinator.add_signature(sig2)
        
        signed_tx = coordinator.get_signed_transaction()
        
        result = wallet.broadcast(signed_tx)
        
        assert result['success'] is True
        assert 'transaction_hash' in result
    
    def test_broadcast_fails_without_threshold(self, multi_sig_wallet_class, repo_module, key_pair_class):
        """Test that broadcast fails without threshold signatures."""
        sign_payload = getattr(repo_module, 'sign_payload', None)
        SignedTransaction = getattr(repo_module, 'SignedTransaction', None)
        ThresholdNotMetError = getattr(repo_module, 'ThresholdNotMetError', None)
        if any(c is None for c in [sign_payload, SignedTransaction, ThresholdNotMetError]):
            pytest.skip("Required items not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        wallet = multi_sig_wallet_class(public_keys)
        
        payload = wallet.create_transaction_payload(recipient="b" * 40, amount=50000)
        
        sig = sign_payload(keys[0], payload, 0)
        
        signed_tx = SignedTransaction(payload=payload, signatures=[sig])
        
        with pytest.raises(ThresholdNotMetError):
            wallet.broadcast(signed_tx)


class TestFullFlow:
    """Integration tests for the complete multi-sig flow."""
    
    def test_complete_2_of_3_flow(self, multi_sig_wallet_class, repo_module, key_pair_class):
        """Test the complete 2-of-3 multi-sig flow."""
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if sign_payload is None:
            pytest.skip("sign_payload not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        
        wallet = multi_sig_wallet_class(public_keys, threshold=2)
        
        payload = wallet.create_transaction_payload(
            recipient="b" * 40,
            amount=100000
        )
        
        coordinator = wallet.create_coordinator(payload)
        
        sig1 = sign_payload(keys[0], payload, 0)
        sig2 = sign_payload(keys[2], payload, 2)
        
        coordinator.add_signature(sig1)
        coordinator.add_signature(sig2)
        
        assert coordinator.is_threshold_met()
        
        signed_tx = coordinator.get_signed_transaction()
        
        result = wallet.broadcast(signed_tx)
        
        assert result['success'] is True
    
    def test_all_three_signers(self, multi_sig_wallet_class, repo_module, key_pair_class):
        """Test with all three signers."""
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if sign_payload is None:
            pytest.skip("sign_payload not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        
        wallet = multi_sig_wallet_class(public_keys, threshold=2)
        
        payload = wallet.create_transaction_payload(
            recipient="c" * 40,
            amount=200000
        )
        
        coordinator = wallet.create_coordinator(payload)
        
        for i, key in enumerate(keys):
            sig = sign_payload(key, payload, i)
            coordinator.add_signature(sig)
        
        assert coordinator.get_signature_count() == 3
        
        signed_tx = coordinator.get_signed_transaction()
        
        assert len(signed_tx.signatures) == 3


class TestNonceValidationAtBroadcast:
    """Tests for nonce validation during broadcast."""
    
    def test_broadcast_rejects_unregistered_nonce(self, multi_sig_wallet_class, repo_module, key_pair_class):
        """Test that broadcast rejects transactions with unregistered nonces."""
        sign_payload = getattr(repo_module, 'sign_payload', None)
        Transaction = getattr(repo_module, 'Transaction', None)
        TransactionPayload = getattr(repo_module, 'TransactionPayload', None)
        SignedTransaction = getattr(repo_module, 'SignedTransaction', None)
        NonceError = getattr(repo_module, 'NonceError', None)
        if any(c is None for c in [sign_payload, Transaction, TransactionPayload, SignedTransaction, NonceError]):
            pytest.skip("Required items not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        wallet = multi_sig_wallet_class(public_keys)
        
        # Manually create a payload with unregistered nonce (bypassing wallet)
        tx = Transaction(recipient="b" * 40, amount=50000, nonce=9999, fee=2000)
        payload = TransactionPayload(
            sender_addresses=wallet.addresses,
            transaction=tx,
            threshold=2
        )
        
        # Sign valid signatures
        sig1 = sign_payload(keys[0], payload, 0)
        sig2 = sign_payload(keys[1], payload, 1)
        
        signed_tx = SignedTransaction(payload=payload, signatures=[sig1, sig2])
        
        # Broadcast should reject - nonce wasn't registered through wallet
        with pytest.raises(NonceError):
            wallet.broadcast(signed_tx)
    
    def test_broadcast_accepts_registered_nonce(self, multi_sig_wallet_class, repo_module, key_pair_class):
        """Test that broadcast accepts transactions with registered nonces."""
        sign_payload = getattr(repo_module, 'sign_payload', None)
        if sign_payload is None:
            pytest.skip("sign_payload not implemented")
        
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        wallet = multi_sig_wallet_class(public_keys)
        
        # Create payload through wallet (registers nonce)
        payload = wallet.create_transaction_payload(recipient="b" * 40, amount=50000)
        
        sig1 = sign_payload(keys[0], payload, 0)
        sig2 = sign_payload(keys[1], payload, 1)
        
        coordinator = wallet.create_coordinator(payload)
        coordinator.add_signature(sig1)
        coordinator.add_signature(sig2)
        
        signed_tx = coordinator.get_signed_transaction()
        
        # Broadcast should succeed - nonce was registered
        result = wallet.broadcast(signed_tx)
        assert result['success'] is True
    
    def test_nonce_registry_accessible(self, multi_sig_wallet_class, key_pair_class):
        """Test that wallet exposes nonce registry."""
        keys = [key_pair_class() for _ in range(3)]
        public_keys = [k.public_key for k in keys]
        wallet = multi_sig_wallet_class(public_keys)
        
        # Create payload registers nonce
        payload = wallet.create_transaction_payload(recipient="b" * 40, amount=50000)
        
        assert wallet.nonce_registry.is_used(payload.transaction.nonce) is True

