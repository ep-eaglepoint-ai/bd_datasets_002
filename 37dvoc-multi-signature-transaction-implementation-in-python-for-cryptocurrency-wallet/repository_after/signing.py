"""Signing logic with signature normalization."""

import hashlib

from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError
from ecdsa.util import sigencode_der, sigdecode_der

from .exceptions import SignatureError
from .transaction import TransactionPayload, PartialSignature
from .key_management import KeyPair


SECP256K1_ORDER = SECP256k1.order
SECP256K1_HALF_ORDER = SECP256K1_ORDER // 2


def normalize_signature(signature: bytes) -> bytes:
    """
    Normalize signature to low-S form to prevent malleability.
    Both (r, s) and (r, n-s) are valid; we enforce s <= n/2.
    """
    try:
        r, s = sigdecode_der(signature, SECP256K1_ORDER)
        
        if s > SECP256K1_HALF_ORDER:
            s = SECP256K1_ORDER - s
        
        return sigencode_der(r, s, SECP256K1_ORDER)
    except Exception:
        raise SignatureError("Failed to normalize signature")


def sign_payload(key_pair: KeyPair, payload: TransactionPayload, signer_index: int) -> PartialSignature:
    """Create a partial signature using deterministic k (RFC 6979)."""
    try:
        payload_hash = payload.hash()
        
        private_key = key_pair.get_private_key()
        raw_signature = private_key.sign_deterministic(
            payload_hash,
            hashfunc=hashlib.sha256,
            sigencode=sigencode_der
        )
        
        normalized_sig = normalize_signature(raw_signature)
        
        return PartialSignature(
            public_key_bytes=key_pair.public_key_bytes,
            signature=normalized_sig,
            signer_index=signer_index
        )
    except SignatureError:
        raise
    except Exception:
        raise SignatureError("Failed to create signature")


def verify_signature(public_key: VerifyingKey, signature: bytes, payload: TransactionPayload) -> bool:
    """Verify a signature against a public key and payload."""
    try:
        payload_hash = payload.hash()
        public_key.verify(
            signature,
            payload_hash,
            hashfunc=hashlib.sha256,
            sigdecode=sigdecode_der
        )
        return True
    except BadSignatureError:
        return False
    except Exception:
        return False


def verify_partial_signature(partial_sig: PartialSignature, payload: TransactionPayload) -> bool:
    """Verify a partial signature."""
    try:
        public_key = partial_sig.get_verifying_key()
        return verify_signature(public_key, partial_sig.signature, payload)
    except Exception:
        return False


def is_signature_normalized(signature: bytes) -> bool:
    """Check if signature is in low-S normalized form."""
    try:
        _, s = sigdecode_der(signature, SECP256K1_ORDER)
        return s <= SECP256K1_HALF_ORDER
    except Exception:
        return False
