"""Custom exceptions for multi-signature transactions."""


class MultiSigError(Exception):
    """Base exception for multi-signature operations."""
    
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class KeyGenerationError(MultiSigError):
    """Key generation failed."""
    pass


class InvalidAddressError(MultiSigError):
    """Invalid address format."""
    pass


class InvalidAmountError(MultiSigError):
    """Invalid transaction amount."""
    pass


class NonceError(MultiSigError):
    """Nonce validation failed."""
    pass


class SignatureError(MultiSigError):
    """Signature creation or verification failed."""
    pass


class ThresholdNotMetError(MultiSigError):
    """Required signature threshold not met."""
    pass


class BroadcastError(MultiSigError):
    """Transaction broadcast failed."""
    pass


class ValidationError(MultiSigError):
    """Input validation failed."""
    pass
