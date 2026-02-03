"""Tests for key management module."""

import os
import pytest
from tests.conftest import import_from_repository


class TestKeyPairGeneration:
    """Tests for secure key pair generation."""
    
    def test_key_pair_creation(self, key_pair_class):
        """Test that KeyPair can be created successfully."""
        kp = key_pair_class()
        assert kp is not None
    
    def test_public_key_exists(self, key_pair_class):
        """Test that public key is accessible."""
        kp = key_pair_class()
        assert kp.public_key is not None
    
    def test_public_key_bytes(self, key_pair_class):
        """Test that public key can be serialized to bytes."""
        kp = key_pair_class()
        pk_bytes = kp.public_key_bytes
        assert isinstance(pk_bytes, bytes)
        assert len(pk_bytes) == 64  # secp256k1 uncompressed public key
    
    def test_public_key_hex(self, key_pair_class):
        """Test that public key can be serialized to hex."""
        kp = key_pair_class()
        pk_hex = kp.public_key_hex
        assert isinstance(pk_hex, str)
        assert len(pk_hex) == 128
    
    def test_unique_keys_generated(self, key_pair_class):
        """Test that each key pair is unique (uses secure randomness)."""
        keys = [key_pair_class() for _ in range(10)]
        public_keys = [kp.public_key_hex for kp in keys]
        assert len(set(public_keys)) == 10
    
    def test_private_key_accessible(self, key_pair_class):
        """Test that private key is accessible (for signing)."""
        kp = key_pair_class()
        private_key = kp.get_private_key()
        assert private_key is not None
    
    def test_private_key_bytes(self, key_pair_class):
        """Test that private key can be serialized to bytes."""
        kp = key_pair_class()
        pk_bytes = kp.get_private_key_bytes()
        assert isinstance(pk_bytes, bytes)
        assert len(pk_bytes) == 32
    
    def test_from_private_bytes(self, key_pair_class):
        """Test key pair creation from existing private key bytes."""
        kp1 = key_pair_class()
        private_bytes = kp1.get_private_key_bytes()
        
        kp2 = key_pair_class.from_private_bytes(private_bytes)
        assert kp2.public_key_hex == kp1.public_key_hex
    
    def test_sign_and_verify(self, key_pair_class):
        """Test signing and verifying data."""
        kp = key_pair_class()
        data = b"test message"
        
        signature = kp.sign(data)
        assert isinstance(signature, bytes)
        
        is_valid = kp.verify(signature, data)
        assert is_valid is True
    
    def test_verify_invalid_signature(self, key_pair_class):
        """Test that invalid signatures are rejected."""
        kp = key_pair_class()
        data = b"test message"
        
        is_valid = kp.verify(b"invalid", data)
        assert is_valid is False
    
    def test_verify_wrong_data(self, key_pair_class):
        """Test that signatures don't verify for wrong data."""
        kp = key_pair_class()
        data = b"test message"
        signature = kp.sign(data)
        
        is_valid = kp.verify(signature, b"different message")
        assert is_valid is False


class TestKeyPairSecurity:
    """Tests for security properties of key management."""
    
    def test_repr_does_not_expose_private_key(self, key_pair_class):
        """Test that repr doesn't leak private key."""
        kp = key_pair_class()
        repr_str = repr(kp)
        
        private_hex = kp.get_private_key_bytes().hex()
        assert private_hex not in repr_str
    
    def test_str_does_not_expose_private_key(self, key_pair_class):
        """Test that str doesn't leak private key."""
        kp = key_pair_class()
        str_repr = str(kp)
        
        private_hex = kp.get_private_key_bytes().hex()
        assert private_hex not in str_repr
    
    def test_deterministic_signing(self, key_pair_class):
        """Test that signing uses deterministic k (RFC 6979)."""
        kp = key_pair_class()
        data = b"test message"
        
        sig1 = kp.sign(data)
        sig2 = kp.sign(data)
        
        assert sig1 == sig2


class TestConstantTimeCompare:
    """Tests for constant-time comparison."""
    
    def test_constant_time_compare_equal(self, repo_module):
        """Test constant time compare returns True for equal values."""
        constant_time_compare = getattr(repo_module, 'constant_time_compare', None)
        if constant_time_compare is None:
            pytest.skip("constant_time_compare not implemented")
        
        result = constant_time_compare(b"test", b"test")
        assert result is True
    
    def test_constant_time_compare_not_equal(self, repo_module):
        """Test constant time compare returns False for unequal values."""
        constant_time_compare = getattr(repo_module, 'constant_time_compare', None)
        if constant_time_compare is None:
            pytest.skip("constant_time_compare not implemented")
        
        result = constant_time_compare(b"test", b"other")
        assert result is False
    
    def test_constant_time_compare_different_lengths(self, repo_module):
        """Test constant time compare returns False for different lengths."""
        constant_time_compare = getattr(repo_module, 'constant_time_compare', None)
        if constant_time_compare is None:
            pytest.skip("constant_time_compare not implemented")
        
        result = constant_time_compare(b"test", b"testing")
        assert result is False


class TestInvalidKeyGeneration:
    """Tests for error handling in key generation."""
    
    def test_from_invalid_private_bytes(self, key_pair_class, repo_module):
        """Test that invalid private key bytes raise error."""
        KeyGenerationError = getattr(repo_module, 'KeyGenerationError', None)
        if KeyGenerationError is None:
            pytest.skip("KeyGenerationError not implemented")
        
        with pytest.raises(KeyGenerationError):
            key_pair_class.from_private_bytes(b"invalid")
    
    def test_from_invalid_public_bytes(self, key_pair_class, repo_module):
        """Test that invalid public key bytes raise error."""
        KeyGenerationError = getattr(repo_module, 'KeyGenerationError', None)
        if KeyGenerationError is None:
            pytest.skip("KeyGenerationError not implemented")
        
        with pytest.raises(KeyGenerationError):
            key_pair_class.from_public_bytes(b"invalid")
