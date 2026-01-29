from typing import Dict, Any, Optional
from repository import UserRepository
from validator import UserValidator
from hasher import PasswordHasher
from service import UserService

class UserManager:
    def __init__(self):
        # Composition Root
        self.repository = UserRepository()
        self.validator = UserValidator(self.repository)
        self.hasher = PasswordHasher()
        self.service = UserService(self.repository, self.validator, self.hasher)
    
    def register_user(self, username: str, email: str, password: str) -> Dict[str, Any]:
        return self.service.register_user(username, email, password)
    
    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        return self.service.authenticate(email, password)
    
    def update_profile(self, user_id: str, **kwargs) -> Dict[str, Any]:
        return self.service.update_profile(user_id, **kwargs)
    
    def delete_user(self, user_id: str) -> bool:
        return self.service.delete_user(user_id)
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self.service.get_user(user_id)
