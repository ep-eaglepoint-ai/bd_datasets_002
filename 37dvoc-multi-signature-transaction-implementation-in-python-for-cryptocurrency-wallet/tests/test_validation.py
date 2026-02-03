"""Tests for validation module and nonce registry."""

import pytest
import threading
from tests.conftest import import_from_repository


class TestAddressValidation:
    """Tests for address validation."""
    
    def test_valid_address(self, repo_module):
        """Test that valid addresses are accepted."""
        validate_address = getattr(repo_module, 'validate_address', None)
        if validate_address is None:
            pytest.skip("validate_address not implemented")
        
        valid = "a" * 40
        result = validate_address(valid)
        assert result == valid
    
    def test_valid_address_uppercase(self, repo_module):
        """Test that uppercase addresses are normalized."""
        validate_address = getattr(repo_module, 'validate_address', None)
        if validate_address is None:
            pytest.skip("validate_address not implemented")
        
        result = validate_address("A" * 40)
        assert result == "a" * 40
    
    def test_invalid_address_too_short(self, repo_module):
        """Test that short addresses are rejected."""
        validate_address = getattr(repo_module, 'validate_address', None)
        InvalidAddressError = getattr(repo_module, 'InvalidAddressError', None)
        if validate_address is None or InvalidAddressError is None:
            pytest.skip("Required items not implemented")
        
        with pytest.raises(InvalidAddressError):
            validate_address("abc")
    
    def test_invalid_address_too_long(self, repo_module):
        """Test that long addresses are rejected."""
        validate_address = getattr(repo_module, 'validate_address', None)
        InvalidAddressError = getattr(repo_module, 'InvalidAddressError', None)
        if validate_address is None or InvalidAddressError is None:
            pytest.skip("Required items not implemented")
        
        with pytest.raises(InvalidAddressError):
            validate_address("a" * 50)
    
    def test_invalid_address_non_hex(self, repo_module):
        """Test that non-hex addresses are rejected."""
        validate_address = getattr(repo_module, 'validate_address', None)
        InvalidAddressError = getattr(repo_module, 'InvalidAddressError', None)
        if validate_address is None or InvalidAddressError is None:
            pytest.skip("Required items not implemented")
        
        with pytest.raises(InvalidAddressError):
            validate_address("g" * 40)
    
    def test_invalid_address_not_string(self, repo_module):
        """Test that non-string addresses are rejected."""
        validate_address = getattr(repo_module, 'validate_address', None)
        InvalidAddressError = getattr(repo_module, 'InvalidAddressError', None)
        if validate_address is None or InvalidAddressError is None:
            pytest.skip("Required items not implemented")
        
        with pytest.raises(InvalidAddressError):
            validate_address(12345)


class TestAmountValidation:
    """Tests for amount validation."""
    
    def test_valid_amount(self, repo_module):
        """Test that valid amounts are accepted."""
        validate_amount = getattr(repo_module, 'validate_amount', None)
        if validate_amount is None:
            pytest.skip("validate_amount not implemented")
        
        result = validate_amount(100)
        assert result == 100
    
    def test_invalid_amount_zero(self, repo_module):
        """Test that zero amount is rejected."""
        validate_amount = getattr(repo_module, 'validate_amount', None)
        InvalidAmountError = getattr(repo_module, 'InvalidAmountError', None)
        if validate_amount is None or InvalidAmountError is None:
            pytest.skip("Required items not implemented")
        
        with pytest.raises(InvalidAmountError):
            validate_amount(0)
    
    def test_invalid_amount_negative(self, repo_module):
        """Test that negative amounts are rejected."""
        validate_amount = getattr(repo_module, 'validate_amount', None)
        InvalidAmountError = getattr(repo_module, 'InvalidAmountError', None)
        if validate_amount is None or InvalidAmountError is None:
            pytest.skip("Required items not implemented")
        
        with pytest.raises(InvalidAmountError):
            validate_amount(-100)
    
    def test_invalid_amount_not_integer(self, repo_module):
        """Test that non-integer amounts are rejected."""
        validate_amount = getattr(repo_module, 'validate_amount', None)
        InvalidAmountError = getattr(repo_module, 'InvalidAmountError', None)
        if validate_amount is None or InvalidAmountError is None:
            pytest.skip("Required items not implemented")
        
        with pytest.raises(InvalidAmountError):
            validate_amount("100")


class TestNonceValidation:
    """Tests for nonce validation."""
    
    def test_valid_nonce(self, repo_module):
        """Test that valid nonces are accepted."""
        validate_nonce = getattr(repo_module, 'validate_nonce', None)
        if validate_nonce is None:
            pytest.skip("validate_nonce not implemented")
        
        result = validate_nonce(0)
        assert result == 0
        
        result = validate_nonce(100)
        assert result == 100
    
    def test_invalid_nonce_negative(self, repo_module):
        """Test that negative nonces are rejected."""
        validate_nonce = getattr(repo_module, 'validate_nonce', None)
        NonceError = getattr(repo_module, 'NonceError', None)
        if validate_nonce is None or NonceError is None:
            pytest.skip("Required items not implemented")
        
        with pytest.raises(NonceError):
            validate_nonce(-1)


class TestNonceRegistry:
    """Tests for nonce registry (replay attack prevention)."""
    
    def test_register_nonce(self, nonce_registry_class):
        """Test registering a nonce."""
        registry = nonce_registry_class()
        registry.register(0)
        
        assert registry.is_used(0) is True
        assert len(registry) == 1
    
    def test_duplicate_nonce_rejected(self, nonce_registry_class, repo_module):
        """Test that duplicate nonces are rejected."""
        NonceError = getattr(repo_module, 'NonceError', None)
        if NonceError is None:
            pytest.skip("NonceError not implemented")
        
        registry = nonce_registry_class()
        registry.register(0)
        
        with pytest.raises(NonceError):
            registry.register(0)
    
    def test_multiple_unique_nonces(self, nonce_registry_class):
        """Test registering multiple unique nonces."""
        registry = nonce_registry_class()
        
        for i in range(10):
            registry.register(i)
        
        assert len(registry) == 10
        
        for i in range(10):
            assert registry.is_used(i) is True
    
    def test_clear_registry(self, nonce_registry_class):
        """Test clearing the registry."""
        registry = nonce_registry_class()
        
        for i in range(5):
            registry.register(i)
        
        registry.clear()
        
        assert len(registry) == 0
        assert registry.is_used(0) is False
    
    def test_thread_safety(self, nonce_registry_class, repo_module):
        """Test that nonce registry is thread-safe."""
        NonceError = getattr(repo_module, 'NonceError', None)
        if NonceError is None:
            pytest.skip("NonceError not implemented")
        
        registry = nonce_registry_class()
        errors = []
        success_count = [0]
        
        def register_nonce(nonce):
            try:
                registry.register(nonce)
                success_count[0] += 1
            except NonceError:
                errors.append(nonce)
        
        threads = []
        for i in range(100):
            t = threading.Thread(target=register_nonce, args=(i % 10,))
            threads.append(t)
        
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        assert len(registry) == 10
        assert success_count[0] == 10
        assert len(errors) == 90
