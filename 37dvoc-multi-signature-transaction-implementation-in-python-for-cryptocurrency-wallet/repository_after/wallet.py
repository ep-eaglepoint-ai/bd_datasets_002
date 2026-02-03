"""Multi-signature wallet."""

from typing import List, Optional

from ecdsa import VerifyingKey, SECP256k1

from .exceptions import BroadcastError, ThresholdNotMetError, ValidationError, NonceError
from .transaction import Transaction, TransactionPayload, SignedTransaction
from .coordinator import SignatureCoordinator
from .validation import NonceRegistry
from .key_management import derive_address_from_public_key


class MultiSigWallet:
    """2-of-3 multi-signature wallet for cryptocurrency transactions."""
    
    BASE_FEE = 1000
    FEE_PER_SIGNATURE = 500
    
    def __init__(self, public_keys: List[VerifyingKey], threshold: int = 2):
        """Initialize with 3 public keys and signature threshold (default 2)."""
        if len(public_keys) != 3:
            raise ValidationError("Multi-sig wallet requires exactly 3 public keys")
        
        if not 1 <= threshold <= 3:
            raise ValidationError("Threshold must be between 1 and 3")
        
        self._public_keys = public_keys
        self._threshold = threshold
        self._addresses = [
            derive_address_from_public_key(pk) for pk in public_keys
        ]
        self._nonce_registry = NonceRegistry()
        self._next_nonce = 0
    
    @property
    def addresses(self) -> List[str]:
        return self._addresses.copy()
    
    @property
    def public_key_bytes_list(self) -> List[bytes]:
        return [pk.to_string() for pk in self._public_keys]
    
    @property
    def threshold(self) -> int:
        return self._threshold
    
    @property
    def nonce_registry(self) -> NonceRegistry:
        """Access to nonce registry for external validation."""
        return self._nonce_registry
    
    def estimate_fee(self) -> int:
        return self.BASE_FEE + (self.FEE_PER_SIGNATURE * self._threshold)
    
    def get_next_nonce(self) -> int:
        """Get and reserve the next nonce."""
        nonce = self._next_nonce
        self._next_nonce += 1
        return nonce
    
    def create_transaction_payload(
        self,
        recipient: str,
        amount: int,
        nonce: Optional[int] = None,
        fee: Optional[int] = None
    ) -> TransactionPayload:
        """Create an unsigned transaction payload."""
        if nonce is None:
            nonce = self.get_next_nonce()
        
        self._nonce_registry.register(nonce)
        
        if fee is None:
            fee = self.estimate_fee()
        
        transaction = Transaction(
            recipient=recipient,
            amount=amount,
            nonce=nonce,
            fee=fee
        )
        
        return TransactionPayload(
            sender_addresses=self._addresses,
            transaction=transaction,
            threshold=self._threshold
        )
    
    def create_coordinator(self, payload: TransactionPayload) -> SignatureCoordinator:
        """Create a coordinator for collecting signatures."""
        return SignatureCoordinator(
            payload=payload,
            authorized_keys=self.public_key_bytes_list
        )
    
    def broadcast(self, signed_tx: SignedTransaction) -> dict:
        """Broadcast a fully signed transaction."""
        if not signed_tx.is_threshold_met():
            raise ThresholdNotMetError(
                f"Need {self._threshold} signatures for broadcast"
            )
        
        # Re-validate nonce hasn't been used by another transaction
        tx_nonce = signed_tx.payload.transaction.nonce
        if not self._nonce_registry.is_used(tx_nonce):
            raise NonceError(
                "Transaction nonce was not registered through this wallet"
            )
        
        tx_data = signed_tx.to_broadcast_format()
        
        return {
            'success': True,
            'transaction_hash': signed_tx.payload_hash,
            'nonce': tx_nonce,
            'signature_count': len(signed_tx.signatures)
        }
    
    def __repr__(self) -> str:
        return f"MultiSigWallet(threshold={self._threshold}, addresses={len(self._addresses)})"
