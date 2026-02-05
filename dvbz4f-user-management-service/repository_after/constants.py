class Constants:
    MIN_USERNAME_LENGTH = 3
    MAX_USERNAME_LENGTH = 20
    MIN_PASSWORD_LENGTH = 8
    
    # Regex patterns
    USERNAME_PATTERN = r'^[a-zA-Z0-9_]+$'
    EMAIL_PATTERN = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    PASSWORD_UPPERCASE_PATTERN = r'[A-Z]'
    PASSWORD_LOWERCASE_PATTERN = r'[a-z]'
    PASSWORD_DIGIT_PATTERN = r'[0-9]'
    
    # Error messages
    ERR_USERNAME_LENGTH = f"Username must be between {MIN_USERNAME_LENGTH} and {MAX_USERNAME_LENGTH} characters"
    ERR_USERNAME_CHARS = "Username can only contain letters, numbers, and underscores"
    ERR_EMAIL_FORMAT = "Invalid email format"
    ERR_PASSWORD_LENGTH = f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    ERR_PASSWORD_UPPERCASE = "Password must contain at least one uppercase letter"
    ERR_PASSWORD_LOWERCASE = "Password must contain at least one lowercase letter"
    ERR_PASSWORD_DIGIT = "Password must contain at least one digit"
    ERR_EMAIL_EXISTS = "Email already registered"
    ERR_ACCOUNT_DEACTIVATED = "Account is deactivated"
    ERR_USER_NOT_FOUND = "User not found"
