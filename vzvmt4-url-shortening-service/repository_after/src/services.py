CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
BASE = len(CHARS)

OFFSET = 14776336

def encode_base62(num: int) -> str:
    """Encode a positive integer into a Base62 string."""
    if num == 0:
        return CHARS[0]
    
    encoded = []
    while num > 0:
        num, rem = divmod(num, BASE)
        encoded.append(CHARS[rem])
    
    return "".join(reversed(encoded))

def decode_base62(token: str) -> int:
    """Decode a Base62 string into a positive integer."""
    decoded = 0
    for char in token:
        decoded = decoded * BASE + CHARS.index(char)
    return decoded

def generate_short_code(db_id: int) -> str:
    """Generate a short code from a database ID using Base62 encoding with offset."""
    target_id = db_id + OFFSET
    return encode_base62(target_id)
