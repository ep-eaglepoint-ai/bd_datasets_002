import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from repository import UserRepository
from validator import UserValidator
from hasher import PasswordHasher
from user import User
from constants import Constants

class UserService:
    def __init__(self, repository: UserRepository, validator: UserValidator, hasher: PasswordHasher):
        self.repository = repository
        self.validator = validator
        self.hasher = hasher
    
    def register_user(self, username: str, email: str, password: str) -> Dict[str, Any]:
        self.validator.validate_registration(username, email, password)
        
        hashed, salt = self.hasher.hash_password(password)
        user_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        user = User(
            id=user_id,
            username=username,
            email=email,
            password_hash=hashed,
            salt=salt,
            created_at=now,
            updated_at=now,
            is_active=True
        )
        
        self.repository.save(user)
        
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'created_at': user.created_at
        }

    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        user = self.repository.find_by_email(email)
        if not user:
            return None
            
        if not user.is_active:
            raise ValueError(Constants.ERR_ACCOUNT_DEACTIVATED)
            
        if self.hasher.verify_password(password, user.password_hash, user.salt):
            return {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        return None

    def update_profile(self, user_id: str, **kwargs) -> Dict[str, Any]:
        user = self.repository.find_by_id(user_id)
        if not user:
            raise ValueError(Constants.ERR_USER_NOT_FOUND)
            
        # Extract potential updates
        new_username = kwargs.get('username')
        new_email = kwargs.get('email')
        new_password = kwargs.get('password')
        
        self.validator.validate_update(user_id, new_username, new_email, new_password)
        
        if new_username:
            user.username = new_username
            
        if new_email:
            user.email = new_email
            
        if new_password:
            hashed, salt = self.hasher.hash_password(new_password)
            user.password_hash = hashed
            user.salt = salt
            
        user.updated_at = datetime.now().isoformat()
        self.repository.save(user)
        
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'updated_at': user.updated_at
        }

    def delete_user(self, user_id: str) -> bool:
        if not self.repository.find_by_id(user_id):
            raise ValueError(Constants.ERR_USER_NOT_FOUND)
        return self.repository.delete(user_id)

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        user = self.repository.find_by_id(user_id)
        if not user:
            return None
            
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'created_at': user.created_at,
            'is_active': user.is_active
        }
