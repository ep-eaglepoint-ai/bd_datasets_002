"""Coordinator for collecting and verifying partial signatures."""

from typing import Dict, List, Set

from ecdsa import VerifyingKey

from .exceptions import SignatureError, ThresholdNotMetError
from .transaction import TransactionPayload, PartialSignature, SignedTransaction
from .signing import verify_partial_signature, is_signature_normalized, normalize_signature
from .key_management import constant_time_compare


class SignatureCoordinator:
    """
    Coordinator for multi-signature transaction signing.
    Collects partial signatures, verifies each one, and aggregates them.
    """
    
    def __init__(self, payload: TransactionPayload, authorized_keys: List[bytes]):
        """Initialize with payload and list of 3 authorized public key bytes."""
        self._payload = payload
        self._authorized_keys: List[bytes] = list(authorized_keys)
        self._signatures: Dict[bytes, PartialSignature] = {}
        self._threshold = payload.threshold
        
        if len(self._authorized_keys) != 3:
            from .exceptions import ValidationError
            raise ValidationError("Coordinator requires exactly 3 authorized keys")
    
    def is_authorized_key(self, public_key_bytes: bytes) -> bool:
        """Check if a public key is authorized (constant-time, no early exit)."""
        # Compare against ALL keys to prevent timing attacks
        # No early return - always compare all keys
        result = False
        for auth_key in self._authorized_keys:
            if constant_time_compare(public_key_bytes, auth_key):
                result = True
            # Continue checking all keys even after match
        return result
    
    def add_signature(self, partial_sig: PartialSignature) -> bool:
        """
        Add a partial signature after verification.
        Returns True if added, False if duplicate. Raises SignatureError if invalid.
        """
        if not self.is_authorized_key(partial_sig.public_key_bytes):
            raise SignatureError("Signature from unauthorized key")
        
        if partial_sig.public_key_bytes in self._signatures:
            return False
        
        # Check signature is in normalized low-S form to prevent malleability
        if not is_signature_normalized(partial_sig.signature):
            raise SignatureError("Signature must be in low-S normalized form")
        
        if not verify_partial_signature(partial_sig, self._payload):
            raise SignatureError("Signature verification failed")
        
        self._signatures[partial_sig.public_key_bytes] = partial_sig
        return True
    
    def get_signature_count(self) -> int:
        return len(self._signatures)
    
    def is_threshold_met(self) -> bool:
        return self.get_signature_count() >= self._threshold
    
    def get_signed_transaction(self) -> SignedTransaction:
        """Get the fully signed transaction. Raises ThresholdNotMetError if not ready."""
        if not self.is_threshold_met():
            raise ThresholdNotMetError(
                f"Need {self._threshold} signatures, have {self.get_signature_count()}"
            )
        
        return SignedTransaction(
            payload=self._payload,
            signatures=list(self._signatures.values())
        )
    
    def get_missing_signer_count(self) -> int:
        return max(0, self._threshold - self.get_signature_count())
    
    def get_signed_keys(self) -> List[str]:
        """Get public keys that have signed (as hex)."""
        return [key.hex() for key in self._signatures.keys()]
    
    def reset(self) -> None:
        """Clear all collected signatures."""
        self._signatures.clear()
