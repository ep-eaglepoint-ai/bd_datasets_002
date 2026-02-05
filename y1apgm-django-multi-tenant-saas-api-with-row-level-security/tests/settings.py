"""
Shared test-specific Django settings that uses SQLite instead of PostgreSQL.
This file is used by pytest to run tests against both repository_before and repository_after.
"""
# Import settings from the repository being tested (PYTHONPATH determines which one)
from config.settings import *

# Override database to use SQLite for testing
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Disable password hashing for faster tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]
