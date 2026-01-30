"""Transaction data structures."""

import hashlib
import json
from dataclasses import dataclass, field
from typing import List, Optional

from ecdsa import VerifyingKey, SECP256k1

from .validation import validate_address, validate_amount, validate_fee, validate_nonce


@dataclass(frozen=True)
class Transaction:
    """Immutable transaction data."""
    recipient: str
    amount: int
    nonce: int
    fee: int
    
    def __post_init__(self):
        object.__setattr__(self, 'recipient', validate_address(self.recipient))
        object.__setattr__(self, 'amount', validate_amount(self.amount))
        object.__setattr__(self, 'nonce', validate_nonce(self.nonce))
        object.__setattr__(self, 'fee', validate_fee(self.fee))


@dataclass
class TransactionPayload:
    """Transaction payload for signing."""
    sender_addresses: List[str]
    transaction: Transaction
    threshold: int = 2
    
    def __post_init__(self):
        self.sender_addresses = [
            validate_address(addr) for addr in self.sender_addresses
        ]
        if len(self.sender_addresses) != 3:
            from .exceptions import ValidationError
            raise ValidationError("Multi-sig wallet requires exactly 3 addresses")
    
    def to_bytes(self) -> bytes:
        """Serialize payload to bytes for hashing."""
        payload_dict = {
            'sender_addresses': sorted(self.sender_addresses),
            'recipient': self.transaction.recipient,
            'amount': self.transaction.amount,
            'nonce': self.transaction.nonce,
            'fee': self.transaction.fee,
            'threshold': self.threshold
        }
        return json.dumps(payload_dict, sort_keys=True).encode('utf-8')
    
    def hash(self) -> bytes:
        """SHA256 hash of the payload."""
        return hashlib.sha256(self.to_bytes()).digest()
    
    def hash_hex(self) -> str:
        return self.hash().hex()


@dataclass
class PartialSignature:
    """A partial signature from one signer."""
    public_key_bytes: bytes
    signature: bytes
    signer_index: int
    
    def public_key_hex(self) -> str:
        return self.public_key_bytes.hex()
    
    def get_verifying_key(self) -> VerifyingKey:
        return VerifyingKey.from_string(self.public_key_bytes, curve=SECP256k1)


@dataclass
class SignedTransaction:
    """Fully signed transaction ready for broadcast."""
    payload: TransactionPayload
    signatures: List[PartialSignature]
    payload_hash: str = field(init=False)
    
    def __post_init__(self):
        self.payload_hash = self.payload.hash_hex()
    
    def is_threshold_met(self) -> bool:
        return len(self.signatures) >= self.payload.threshold
    
    def get_signer_public_keys(self) -> List[str]:
        return [sig.public_key_hex() for sig in self.signatures]
    
    def to_broadcast_format(self) -> dict:
        """Convert to format suitable for network broadcast."""
        return {
            'payload': {
                'sender_addresses': self.payload.sender_addresses,
                'recipient': self.payload.transaction.recipient,
                'amount': self.payload.transaction.amount,
                'nonce': self.payload.transaction.nonce,
                'fee': self.payload.transaction.fee,
                'threshold': self.payload.threshold
            },
            'payload_hash': self.payload_hash,
            'signatures': [
                {
                    'public_key': sig.public_key_hex(),
                    'signature': sig.signature.hex(),
                    'signer_index': sig.signer_index
                }
                for sig in self.signatures
            ],
            'signature_count': len(self.signatures)
        }
