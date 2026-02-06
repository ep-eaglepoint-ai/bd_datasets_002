"""
akbmvk self-decrypting time-dependent polyglot package.

This package contains an explicitly-invoked encrypted payload runner.
No code is executed on import.
"""

__all__ = ["run_payload", "PAYLOAD"]

from .runner import run_payload, PAYLOAD
