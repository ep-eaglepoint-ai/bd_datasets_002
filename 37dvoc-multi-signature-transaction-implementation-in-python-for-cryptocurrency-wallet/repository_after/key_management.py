"""Key management with secp256k1."""

import os
import hmac
import hashlib
from typing import Optional

from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError

from .exceptions import KeyGenerationError


class KeyPair:
    """Key pair for secp256k1 elliptic curve operations."""
    
    def __init__(self, private_key: Optional[SigningKey] = None):
        """Create a key pair. Generates a new key if none provided."""
        if private_key is None:
            self._private_key = self._generate_secure_key()
        else:
            self._private_key = private_key
        self._public_key = self._private_key.get_verifying_key()
    
    @staticmethod
    def _generate_secure_key() -> SigningKey:
        """Generate a private key using os.urandom."""
        try:
            entropy = os.urandom(32)
            return SigningKey.from_string(entropy, curve=SECP256k1)
        except Exception:
            raise KeyGenerationError("Failed to generate secure key pair")
    
    @classmethod
    def from_private_bytes(cls, private_bytes: bytes) -> "KeyPair":
        """Create KeyPair from raw private key bytes."""
        try:
            private_key = SigningKey.from_string(private_bytes, curve=SECP256k1)
            return cls(private_key)
        except Exception:
            raise KeyGenerationError("Invalid private key bytes")
    
    @classmethod
    def from_public_bytes(cls, public_bytes: bytes) -> VerifyingKey:
        """Create a public key from raw bytes (for verification only)."""
        try:
            return VerifyingKey.from_string(public_bytes, curve=SECP256k1)
        except Exception:
            raise KeyGenerationError("Invalid public key bytes")
    
    @property
    def public_key(self) -> VerifyingKey:
        return self._public_key
    
    @property
    def public_key_bytes(self) -> bytes:
        return self._public_key.to_string()
    
    @property
    def public_key_hex(self) -> str:
        return self._public_key.to_string().hex()
    
    def get_private_key(self) -> SigningKey:
        """Get the private key (use with caution)."""
        return self._private_key
    
    def get_private_key_bytes(self) -> bytes:
        """Get raw private key bytes (use with caution)."""
        return self._private_key.to_string()
    
    def sign(self, data: bytes) -> bytes:
        """Sign data using deterministic k (RFC 6979)."""
        return self._private_key.sign_deterministic(data, hashfunc=hashlib.sha256)
    
    def verify(self, signature: bytes, data: bytes) -> bool:
        """Verify a signature."""
        try:
            self._public_key.verify(signature, data, hashfunc=hashlib.sha256)
            return True
        except BadSignatureError:
            return False
    
    def __repr__(self) -> str:
        return f"KeyPair(public_key={self.public_key_hex[:16]}...)"
    
    def __str__(self) -> str:
        return self.__repr__()


def constant_time_compare(a: bytes, b: bytes) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    return hmac.compare_digest(a, b)


def derive_address_from_public_key(public_key: VerifyingKey) -> str:
    """Derive address using SHA256 + RIPEMD160."""
    pubkey_bytes = public_key.to_string()
    sha256_hash = hashlib.sha256(pubkey_bytes).digest()
    ripemd160 = hashlib.new('ripemd160')
    ripemd160.update(sha256_hash)
    return ripemd160.hexdigest()
