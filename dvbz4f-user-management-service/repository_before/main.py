import hashlib
import re
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

class UserManager:
    def __init__(self):
        self.users = {}
    
    def register_user(self, username: str, email: str, password: str) -> Dict[str, Any]:
        if len(username) < 3 or len(username) > 20:
            raise ValueError("Username must be between 3 and 20 characters")
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            raise ValueError("Username can only contain letters, numbers, and underscores")
        if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email):
            raise ValueError("Invalid email format")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r'[A-Z]', password):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', password):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r'[0-9]', password):
            raise ValueError("Password must contain at least one digit")
        for user in self.users.values():
            if user['email'] == email:
                raise ValueError("Email already registered")
        salt = uuid.uuid4().hex
        hashed = hashlib.sha256((password + salt).encode()).hexdigest()
        user_id = str(uuid.uuid4())
        user = {
            'id': user_id,
            'username': username,
            'email': email,
            'password_hash': hashed,
            'salt': salt,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'is_active': True
        }
        self.users[user_id] = user
        return {
            'id': user_id,
            'username': username,
            'email': email,
            'created_at': user['created_at']
        }
    
    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        for user in self.users.values():
            if user['email'] == email:
                if not user['is_active']:
                    raise ValueError("Account is deactivated")
                hashed = hashlib.sha256((password + user['salt']).encode()).hexdigest()
                if hashed == user['password_hash']:
                    return {
                        'id': user['id'],
                        'username': user['username'],
                        'email': user['email']
                    }
                else:
                    return None
        return None
    
    def update_profile(self, user_id: str, **kwargs) -> Dict[str, Any]:
        if user_id not in self.users:
            raise ValueError("User not found")
        user = self.users[user_id]
        if 'username' in kwargs:
            new_username = kwargs['username']
            if len(new_username) < 3 or len(new_username) > 20:
                raise ValueError("Username must be between 3 and 20 characters")
            if not re.match(r'^[a-zA-Z0-9_]+$', new_username):
                raise ValueError("Username can only contain letters, numbers, and underscores")
            user['username'] = new_username
        if 'email' in kwargs:
            new_email = kwargs['email']
            if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', new_email):
                raise ValueError("Invalid email format")
            for other_user in self.users.values():
                if other_user['id'] != user_id and other_user['email'] == new_email:
                    raise ValueError("Email already registered")
            user['email'] = new_email
        if 'password' in kwargs:
            new_password = kwargs['password']
            if len(new_password) < 8:
                raise ValueError("Password must be at least 8 characters")
            if not re.search(r'[A-Z]', new_password):
                raise ValueError("Password must contain at least one uppercase letter")
            if not re.search(r'[a-z]', new_password):
                raise ValueError("Password must contain at least one lowercase letter")
            if not re.search(r'[0-9]', new_password):
                raise ValueError("Password must contain at least one digit")
            salt = uuid.uuid4().hex
            hashed = hashlib.sha256((new_password + salt).encode()).hexdigest()
            user['password_hash'] = hashed
            user['salt'] = salt
        user['updated_at'] = datetime.now().isoformat()
        return {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'updated_at': user['updated_at']
        }
    
    def delete_user(self, user_id: str) -> bool:
        if user_id not in self.users:
            raise ValueError("User not found")
        del self.users[user_id]
        return True
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        if user_id not in self.users:
            return None
        user = self.users[user_id]
        return {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'created_at': user['created_at'],
            'is_active': user['is_active']
        }
