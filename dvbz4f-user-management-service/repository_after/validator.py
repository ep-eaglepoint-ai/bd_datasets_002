import re
from typing import Optional
from constants import Constants
from repository import UserRepository

class UserValidator:
    def __init__(self, repository: UserRepository):
        self.repository = repository
        
    def validate_registration(self, username: str, email: str, password: str) -> None:
        self.validate_username(username)
        self.validate_email(email)
        self.validate_password(password)
        
        # Check for duplicate email across all users
        if self.repository.find_by_email(email):
            raise ValueError(Constants.ERR_EMAIL_EXISTS)
            
    def validate_username(self, username: str) -> None:
        if len(username) < Constants.MIN_USERNAME_LENGTH or len(username) > Constants.MAX_USERNAME_LENGTH:
            raise ValueError(Constants.ERR_USERNAME_LENGTH)
        if not re.match(Constants.USERNAME_PATTERN, username):
            raise ValueError(Constants.ERR_USERNAME_CHARS)
            
    def validate_email(self, email: str) -> None:
        if not re.match(Constants.EMAIL_PATTERN, email):
            raise ValueError(Constants.ERR_EMAIL_FORMAT)
            
    def validate_password(self, password: str) -> None:
        if len(password) < Constants.MIN_PASSWORD_LENGTH:
            raise ValueError(Constants.ERR_PASSWORD_LENGTH)
        if not re.search(Constants.PASSWORD_UPPERCASE_PATTERN, password):
            raise ValueError(Constants.ERR_PASSWORD_UPPERCASE)
        if not re.search(Constants.PASSWORD_LOWERCASE_PATTERN, password):
            raise ValueError(Constants.ERR_PASSWORD_LOWERCASE)
        if not re.search(Constants.PASSWORD_DIGIT_PATTERN, password):
            raise ValueError(Constants.ERR_PASSWORD_DIGIT)
            
    def validate_update(self, user_id: str, new_username: Optional[str] = None, 
                       new_email: Optional[str] = None, new_password: Optional[str] = None) -> None:
        if new_username is not None:
            self.validate_username(new_username)
            
        if new_email is not None:
            self.validate_email(new_email)
            existing_user = self.repository.find_by_email(new_email)
            if existing_user and existing_user.id != user_id:
                raise ValueError(Constants.ERR_EMAIL_EXISTS)
                
        if new_password is not None:
            self.validate_password(new_password)
