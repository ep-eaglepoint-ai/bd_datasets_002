"""Input validation with replay attack prevention."""

import re
import threading
from typing import Set

from .exceptions import InvalidAddressError, InvalidAmountError, NonceError


ADDRESS_PATTERN = re.compile(r'^[0-9a-fA-F]{40}$')


def validate_address(address: str) -> str:
    """Validate and normalize a 40-character hex address."""
    if not isinstance(address, str):
        raise InvalidAddressError("Address must be a string")
    
    address = address.lower().strip()
    
    if not ADDRESS_PATTERN.match(address):
        raise InvalidAddressError(
            "Address must be exactly 40 hexadecimal characters"
        )
    
    return address


def validate_amount(amount: int) -> int:
    """Validate that amount is a positive integer."""
    if not isinstance(amount, int):
        raise InvalidAmountError("Amount must be an integer")
    
    if amount <= 0:
        raise InvalidAmountError("Amount must be positive")
    
    return amount


def validate_fee(fee: int) -> int:
    """Validate that fee is a non-negative integer."""
    if not isinstance(fee, int):
        raise InvalidAmountError("Fee must be an integer")
    
    if fee < 0:
        raise InvalidAmountError("Fee cannot be negative")
    
    return fee


def validate_nonce(nonce: int) -> int:
    """Validate that nonce is a non-negative integer."""
    if not isinstance(nonce, int):
        raise NonceError("Nonce must be an integer")
    
    if nonce < 0:
        raise NonceError("Nonce cannot be negative")
    
    return nonce


class NonceRegistry:
    """Thread-safe registry to track used nonces and prevent replay attacks."""
    
    def __init__(self):
        self._used_nonces: Set[int] = set()
        self._lock = threading.Lock()
    
    def register(self, nonce: int) -> None:
        """Register a nonce. Raises NonceError if already used."""
        nonce = validate_nonce(nonce)
        
        with self._lock:
            if nonce in self._used_nonces:
                raise NonceError("Nonce has already been used (replay attack prevented)")
            self._used_nonces.add(nonce)
    
    def is_used(self, nonce: int) -> bool:
        """Check if a nonce has been used."""
        with self._lock:
            return nonce in self._used_nonces
    
    def clear(self) -> None:
        """Clear all registered nonces."""
        with self._lock:
            self._used_nonces.clear()
    
    def __len__(self) -> int:
        with self._lock:
            return len(self._used_nonces)
