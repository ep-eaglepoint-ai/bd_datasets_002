import pytest
import inspect

# These tests verify the architecture requirements
# They should PASS in repository_after (refactored)
# They should FAIL in repository_before (monolithic)

def test_components_exist():
    """Verify that separate component classes exist"""
    try:
        from user import User
        from repository import UserRepository
        from validator import UserValidator
        from hasher import PasswordHasher
        from service import UserService
    except ImportError as e:
        pytest.fail(f"Clean architecture components missing: {e}")

def test_userservice_dependency_injection():
    """Verify UserService accepts dependencies in constructor"""
    try:
        from repository import UserRepository
        from validator import UserValidator
        from hasher import PasswordHasher
        from service import UserService
    except ImportError:
        pytest.fail("Could not import components for DI test")
        
    # Check signature
    sig = inspect.signature(UserService.__init__)
    params = list(sig.parameters.keys())
    
    assert 'repository' in params, "UserService must accept repository"
    assert 'validator' in params, "UserService must accept validator"
    assert 'hasher' in params, "UserService must accept hasher"
    assert 'self' in params or len(params) >= 3 # self is implicit in inspection usually, checking args

def test_user_model_is_dataclass():
    """Verify User is a data class with correct fields"""
    try:
        from user import User
        from dataclasses import is_dataclass
    except ImportError:
        pytest.fail("Could not import User model")
        
    assert is_dataclass(User), "User should be a dataclass"
    
    # Check fields
    annotations = User.__annotations__
    expected_fields = ['id', 'username', 'email', 'password_hash', 'salt', 'created_at', 'updated_at', 'is_active']
    for field in expected_fields:
        assert field in annotations, f"User model missing field: {field}"

def test_constants_class_exists():
    """Verify Constants class exists and contains magic values"""
    try:
        from constants import Constants
    except ImportError:
        pytest.fail("Constants class missing")
        
    assert hasattr(Constants, 'MIN_USERNAME_LENGTH')
    assert hasattr(Constants, 'MAX_USERNAME_LENGTH')
    assert hasattr(Constants, 'ERR_EMAIL_FORMAT')

def test_repository_interface():
    """Verify UserRepository has CRUD methods"""
    try:
        from repository import UserRepository
    except ImportError:
        pytest.fail("UserRepository missing")
        
    repo = UserRepository()
    assert hasattr(repo, 'save')
    assert hasattr(repo, 'find_by_id')
    assert hasattr(repo, 'find_by_email')
    assert hasattr(repo, 'delete')
