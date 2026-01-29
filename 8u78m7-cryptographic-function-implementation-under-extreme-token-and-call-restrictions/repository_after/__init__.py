def cryptographic_transform(b):
    if not isinstance(b, (bytes, bytearray)):
        raise TypeError("Input must be bytes")
    
    # Keccak-f[1600] round constants
    RC = [0x0000000000000001, 0x0000000000008082, 0x800000000000808a,
          0x8000000080008000, 0x000000000000808b, 0x0000000080000001,
          0x8000000080008081, 0x8000000000008009, 0x000000000000008a,
          0x0000000000000088, 0x0000000080008009, 0x000000008000000a,
          0x000000008000808b, 0x800000000000008b, 0x8000000000008089,
          0x8000000000008003, 0x8000000000008002, 0x8000000000000080,
          0x000000000000800a, 0x800000008000000a, 0x8000000080008081,
          0x8000000000008080, 0x0000000080000001, 0x8000000080008008]
    
    # Rotation offsets
    R = [[0, 36, 3, 41, 18],
         [1, 44, 10, 45, 2],
         [62, 6, 43, 15, 61],
         [28, 55, 25, 21, 56],
         [27, 20, 39, 8, 14]]
    
    # Initialize state
    state = [[0] * 5 for _ in range(5)]
    
    # Padding (SHA3-256 uses 0x06 as domain separator)
    rate = 136  # 1088 bits / 8 = 136 bytes for SHA3-256
    padded = bytearray(b)
    padded.append(0x06)
    while len(padded) % rate != rate - 1:
        padded.append(0x00)
    padded.append(0x80)
    
    # Absorb phase
    for block_start in range(0, len(padded), rate):
        for y in range(5):
            for x in range(5):
                if 8 * (x + 5 * y) < rate:
                    offset = block_start + 8 * (x + 5 * y)
                    lane = 0
                    for i in range(8):
                        if offset + i < len(padded):
                            lane |= padded[offset + i] << (8 * i)
                    state[x][y] ^= lane
        
        # Keccak-f[1600] permutation
        for round_idx in range(24):
            # θ (theta) step
            C = [state[x][0] ^ state[x][1] ^ state[x][2] ^ state[x][3] ^ state[x][4] for x in range(5)]
            D = [C[(x - 1) % 5] ^ ((C[(x + 1) % 5] << 1) & 0xFFFFFFFFFFFFFFFF | (C[(x + 1) % 5] >> 63)) for x in range(5)]
            for x in range(5):
                for y in range(5):
                    state[x][y] ^= D[x]
            
            # ρ (rho) and π (pi) steps
            B = [[0] * 5 for _ in range(5)]
            for x in range(5):
                for y in range(5):
                    rot = R[x][y]
                    B[y][(2 * x + 3 * y) % 5] = ((state[x][y] << rot) & 0xFFFFFFFFFFFFFFFF) | (state[x][y] >> (64 - rot))
            
            # χ (chi) step
            for x in range(5):
                for y in range(5):
                    state[x][y] = B[x][y] ^ ((~B[(x + 1) % 5][y]) & B[(x + 2) % 5][y])
            
            # ι (iota) step
            state[0][0] ^= RC[round_idx]
    
    # Squeeze phase - extract 32 bytes (256 bits)
    output = bytearray()
    for y in range(5):
        for x in range(5):
            for i in range(8):
                if len(output) < 32:
                    output.append((state[x][y] >> (8 * i)) & 0xFF)
    
    # XOR each byte with 0xA5 and convert to hex
    return ''.join('%02x' % (b ^ 0xA5) for b in output)
