CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
BASE = len(CHARS)

OFFSET = 14776336

def encode_base62(num: int) -> str:
    if num == 0:
        return CHARS[0]
    
    encoded = []
    while num > 0:
        num, rem = divmod(num, BASE)
        encoded.append(CHARS[rem])
    
    return "".join(reversed(encoded))

def decode_base62(token: str) -> int:
    decoded = 0
    for char in token:
        decoded = decoded * BASE + CHARS.index(char)
    return decoded

def generate_short_code(db_id: int) -> str:
    target_id = db_id + OFFSET
    return encode_base62(target_id)
