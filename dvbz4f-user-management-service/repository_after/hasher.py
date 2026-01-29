import hashlib
import uuid
from typing import Tuple

class PasswordHasher:
    def hash_password(self, password: str, salt: str = None) -> Tuple[str, str]:
        """
        Hashes a password with an optional salt. 
        If salt is not provided, generates a new one.
        Returns tuple of (hashed_password, salt).
        """
        if salt is None:
            salt = uuid.uuid4().hex
        
        hashed = hashlib.sha256((password + salt).encode()).hexdigest()
        return hashed, salt
    
    def verify_password(self, password: str, hashed_password: str, salt: str) -> bool:
        """
        Verifies a password against a hash and salt.
        """
        calculated_hash, _ = self.hash_password(password, salt)
        return calculated_hash == hashed_password
