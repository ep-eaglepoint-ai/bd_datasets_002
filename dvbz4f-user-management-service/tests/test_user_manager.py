import pytest
import re
from datetime import datetime
# We will test the class named "UserManager" which should be available
# from the root of the package defined by PYTHONPATH (repository_before or repository_after)
from main import UserManager

@pytest.fixture
def user_manager():
    return UserManager()

def test_register_user_success(user_manager):
    user = user_manager.register_user("validuser", "valid@example.com", "Password123")
    assert user['username'] == "validuser"
    assert user['email'] == "valid@example.com"
    assert "id" in user
    assert "created_at" in user
    
    # Verify persistence
    fetched = user_manager.get_user(user['id'])
    assert fetched is not None
    assert fetched['username'] == "validuser"

def test_register_user_validation_username(user_manager):
    with pytest.raises(ValueError, match="Username must be between 3 and 20 characters"):
        user_manager.register_user("ab", "valid@example.com", "Password123")
    
    with pytest.raises(ValueError, match="Username can only contain letters, numbers, and underscores"):
        user_manager.register_user("invalid name", "valid@example.com", "Password123")

def test_register_user_validation_email(user_manager):
    with pytest.raises(ValueError, match="Invalid email format"):
        user_manager.register_user("user", "notanemail", "Password123")

def test_register_user_validation_password(user_manager):
    with pytest.raises(ValueError, match="Password must be at least 8 characters"):
        user_manager.register_user("user", "valid@example.com", "Short1")
    
    with pytest.raises(ValueError, match="Password must contain at least one uppercase letter"):
        user_manager.register_user("user", "valid@example.com", "password123")
        
    with pytest.raises(ValueError, match="Password must contain at least one lowercase letter"):
        user_manager.register_user("user", "valid@example.com", "PASSWORD123")
        
    with pytest.raises(ValueError, match="Password must contain at least one digit"):
        user_manager.register_user("user", "valid@example.com", "PasswordNoDigit")

def test_register_duplicate_email(user_manager):
    user_manager.register_user("user1", "duplicate@example.com", "Password123")
    with pytest.raises(ValueError, match="Email already registered"):
        user_manager.register_user("user2", "duplicate@example.com", "Password456")

def test_authenticate_success(user_manager):
    user_manager.register_user("auth_user", "auth@example.com", "Password123")
    result = user_manager.authenticate("auth@example.com", "Password123")
    assert result is not None
    assert result['username'] == "auth_user"

def test_authenticate_failure(user_manager):
    user_manager.register_user("fail_user", "fail@example.com", "Password123")
    assert user_manager.authenticate("fail@example.com", "WrongPass") is None
    assert user_manager.authenticate("nonexistent@example.com", "AnyPass") is None

def test_update_profile_username(user_manager):
    user = user_manager.register_user("update_user", "update@example.com", "Password123")
    updated = user_manager.update_profile(user['id'], username="new_name")
    assert updated['username'] == "new_name"
    
    fetched = user_manager.get_user(user['id'])
    assert fetched['username'] == "new_name"

def test_update_profile_email(user_manager):
    user = user_manager.register_user("update_email", "update_email@example.com", "Password123")
    updated = user_manager.update_profile(user['id'], email="new_email@example.com")
    assert updated['email'] == "new_email@example.com"

def test_update_profile_duplicate_email(user_manager):
    user1 = user_manager.register_user("user1", "email1@example.com", "Password123")
    user2 = user_manager.register_user("user2", "email2@example.com", "Password123")
    
    with pytest.raises(ValueError, match="Email already registered"):
        user_manager.update_profile(user2['id'], email="email1@example.com")

def test_update_profile_password(user_manager):
    user = user_manager.register_user("pass_change", "pass@example.com", "OldPassword1")
    user_manager.update_profile(user['id'], password="NewPassword2")
    
    # Should authenticate with new password
    assert user_manager.authenticate("pass@example.com", "NewPassword2") is not None
    # Should not authenticate with old password
    assert user_manager.authenticate("pass@example.com", "OldPassword1") is None

def test_delete_user(user_manager):
    user = user_manager.register_user("delete_me", "delete@example.com", "Password123")
    assert user_manager.delete_user(user['id']) is True
    
    assert user_manager.get_user(user['id']) is None
    with pytest.raises(ValueError, match="User not found"):
        user_manager.update_profile(user['id'], username="ghost")

def test_immutability(user_manager):
    user = user_manager.register_user("immutable", "immutable@example.com", "Password123")
    original_id = user['id']
    original_created_at = user['created_at']
    
    user_manager.update_profile(user['id'], username="changed")
    fetched = user_manager.get_user(user['id'])
    
    assert fetched['id'] == original_id
    assert fetched['created_at'] == original_created_at

def test_user_not_found(user_manager):
    with pytest.raises(ValueError, match="User not found"):
        user_manager.update_profile("nonexistent_id", username="test")
        
    with pytest.raises(ValueError, match="User not found"):
        user_manager.delete_user("nonexistent_id")

def test_boundaries(user_manager):
    # Test exact boundaries
    # Username: 3 chars (min) -> Should pass
    u1 = user_manager.register_user("abc", "min@example.com", "Password123")
    assert u1['username'] == "abc"
    
    # Username: 20 chars (max) -> Should pass
    long_name = "a" * 20
    u2 = user_manager.register_user(long_name, "max@example.com", "Password123")
    assert u2['username'] == long_name
    
    # Password: 8 chars (min) -> Should pass
    u3 = user_manager.register_user("user3", "pass@example.com", "Pass1234")
    assert u3 is not None

def test_deactivation(user_manager):
    # Since there is no public API to deactivate, we simulate it effectively
    # by modifying the underlying storage to test the authentication guard.
    # This ensures the logic 'if not user["is_active"]' is covered.
    user = user_manager.register_user("deactive", "gone@example.com", "Password123")
    
    # Access internal storage depends on implementation (Before vs After)
    # We try to handle both or fail gracefully if implementation hides it too well
    # But for Python, we can usually access attributes.
    
    # Facade/Original has .users dict
    if hasattr(user_manager, 'users'):
        user_manager.users[user['id']]['is_active'] = False
    # Service (Refactored) might be hidden, but Facade likely exposes nothing.
    # If checking refactored code via Facade, we rely on implementation details for this edge case test.
    elif hasattr(user_manager, 'repository'):
        # In refactored code, user_manager.repository._users
        user_obj = user_manager.repository.find_by_id(user['id'])
        user_obj.is_active = False
        user_manager.repository.save(user_obj)
        
    with pytest.raises(ValueError, match="Account is deactivated"):
        user_manager.authenticate("gone@example.com", "Password123")
