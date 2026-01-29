from typing import Dict, Optional, List
from user import User

class UserRepository:
    def __init__(self):
        self._users: Dict[str, User] = {}
    
    def save(self, user: User) -> User:
        """Saves or updates a user."""
        self._users[user.id] = user
        return user
    
    def find_by_id(self, user_id: str) -> Optional[User]:
        """Finds a user by their ID."""
        return self._users.get(user_id)
    
    def find_by_email(self, email: str) -> Optional[User]:
        """Finds a user by their email."""
        for user in self._users.values():
            if user.email == email:
                return user
        return None
    
    def delete(self, user_id: str) -> bool:
        """Deletes a user by their ID. Returns True if deleted, False if not found."""
        if user_id in self._users:
            del self._users[user_id]
            return True
        return False
        
    def find_all(self) -> List[User]:
        """Returns all users."""
        return list(self._users.values())
