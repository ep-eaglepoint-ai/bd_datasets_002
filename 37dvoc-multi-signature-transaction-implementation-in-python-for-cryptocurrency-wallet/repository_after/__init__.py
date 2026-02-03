"""Multi-signature transaction system for cryptocurrency wallet."""

from .exceptions import (
    MultiSigError,
    KeyGenerationError,
    InvalidAddressError,
    InvalidAmountError,
    NonceError,
    SignatureError,
    ThresholdNotMetError,
    BroadcastError,
    ValidationError,
)
from .key_management import (
    KeyPair,
    constant_time_compare,
    derive_address_from_public_key,
)
from .validation import (
    validate_address,
    validate_amount,
    validate_fee,
    validate_nonce,
    NonceRegistry,
)
from .transaction import (
    Transaction,
    TransactionPayload,
    PartialSignature,
    SignedTransaction,
)
from .signing import (
    normalize_signature,
    sign_payload,
    verify_signature,
    verify_partial_signature,
    is_signature_normalized,
)
from .coordinator import SignatureCoordinator
from .wallet import MultiSigWallet


__all__ = [
    # Exceptions
    'MultiSigError',
    'KeyGenerationError',
    'InvalidAddressError',
    'InvalidAmountError',
    'NonceError',
    'SignatureError',
    'ThresholdNotMetError',
    'BroadcastError',
    'ValidationError',
    # Key Management
    'KeyPair',
    'constant_time_compare',
    'derive_address_from_public_key',
    # Validation
    'validate_address',
    'validate_amount',
    'validate_fee',
    'validate_nonce',
    'NonceRegistry',
    # Transaction
    'Transaction',
    'TransactionPayload',
    'PartialSignature',
    'SignedTransaction',
    # Signing
    'normalize_signature',
    'sign_payload',
    'verify_signature',
    'verify_partial_signature',
    'is_signature_normalized',
    # Coordinator
    'SignatureCoordinator',
    # Wallet
    'MultiSigWallet',
]
