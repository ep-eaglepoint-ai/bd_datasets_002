import pytest
from src.services import encode_base62, decode_base62, generate_short_code
from src.models import URLItem

# REQ-06: Character set: [a-zA-Z0-9]
# REQ-07: Length: 5–8 characters
# REQ-08: Deterministic, no collisions

class TestBijectiveAlgorithm:
    def test_encode_decode_correctness(self):
        """Verify that encoding and decoding are reversible."""
        test_ids = [1, 100, 10000, 15000000, 999999999]
        for num in test_ids:
            code = encode_base62(num)
            decoded = decode_base62(code)
            assert decoded == num, f"Failed for ID {num}"

    def test_character_set(self):
        """Verify that only allowed characters are used."""
        valid_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        code = encode_base62(123456789012345)
        for char in code:
            assert char in valid_chars, f"Invalid character '{char}' in code '{code}'"

    def test_length_constraint_min(self):
        """Verify minimum length of 5 characters."""
        code = generate_short_code(1)
        assert len(code) >= 5, f"Code '{code}' is too short (ID 1)"

    def test_length_constraint_max(self):
        """Verify max length of 8 characters."""
        large_id = 100_000_000_000_000 
        code = encode_base62(large_id)
        assert len(code) <= 8, f"Code '{code}' is too long for ID {large_id}"

class TestURLValidation:
    
    def test_valid_http_url(self):
        url = "http://example.com"
        item = URLItem(target_url=url)
        assert str(item.target_url).rstrip("/") == url.rstrip("/")

    def test_valid_https_url_with_path(self):
        url = "https://example.com/path/to/resource?query=1"
        item = URLItem(target_url=url)
        assert str(item.target_url) == url

    def test_invalid_scheme(self):
        with pytest.raises(Exception): 
            URLItem(target_url="ftp://example.com")

    def test_invalid_format(self):
        with pytest.raises(Exception):
            URLItem(target_url="not_a_url")
