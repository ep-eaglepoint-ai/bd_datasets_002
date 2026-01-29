# Cryptographic Function Implementation Documentation

## 1. Overview
This project implements a custom cryptographic hashing function designed to meet strict operational constraints. The goal was to provide a secure, deterministic hash based on a standard algorithm (SHA3-256) but implemented entirely in pure Python without external dependencies (like `hashlib`). Additionally, a specific output transformation is applied to meet unique project requirements.

## 2. Technical Specification

### Algorithm
The core algorithm is **SHA3-256**, based on the cryptographic primitive **Keccak-f[1600]**. This was chosen for its resistance to length extension attacks and robustness.

### Constraints
The implementation adheres to the following strict constraints:
- **Pure Python**: No C extensions or compiled libraries.
- **Zero Dependencies**: No imports allowed (e.g., `import hashlib` is forbidden).
- **Security**: No use of dynamic execution (`exec`, `eval`) or reflection (`getattr`, etc.).
- **Token/Call Restrictions**: Optimized for minimal function calls and token usage where applicable.

### Transformation Logic
The function `cryptographic_transform(b)` performs the following steps:
1.  **Input Validation**: Enforces `bytes` or `bytearray` input.
2.  **SHA3-256 Computation**:
    -   **State Initialization**: 5x5 matrix of 64-bit lanes.
    -   **Absorbing**: Input data is absorbed with a rate of 136 bytes (1088 bits).
    -   **Padding**: Applies the SHA3 domain separator (`0x06`) and standard padding (`10*1`).
    -   **Permutation**: Executes 24 rounds of the Keccak-f[1600] permutation using standard rotational constants and offsets.
3.  **Obfuscation Layer**:
    -   The standard 32-byte digest is extracted.
    -   **Transformation**: Every byte of the digest is XORed with `0xA5` (decimal 165).
    -   `output_byte = sha3_byte ^ 0xA5`
4.  **Output**: Returns the final transformed bytes as a lowercase hexadecimal string.

## 3. Codebase Structure

### Source Code: `repository_after/__init__.py`
This file contains the standalone `cryptographic_transform` function. It is self-contained and includes all necessary constants (Round Constants, Rotation Offsets) internally to avoid global namespace pollution or external lookups.

### Test Suite: `tests/test_cryptographic_function.py`
A comprehensive `pytest` suite that verifies:
-   **Correctness**: Validates output against pre-calculated vectors (SHA3-256 hash XOR 0xA5).
-   **Compliance**: Static analysis (AST) to ensure no forbidden keywords (`import`, `eval`, `exec`) are used.
-   **Robustness**: Checks against edge cases like empty strings and large payloads (1MB).
-   **Performance**: Ensures execution time is within acceptable limits.

## 4. Replication Steps

To replicate this implementation or verify its functionality:

1.  **Environment Setup**:
    Ensure you have Python 3.x installed along with `pytest`.
    ```bash
    pip install pytest
    ```

2.  **Execution**:
    Run the logical verification tests to ensure the mathematical correctness of the Keccak implementation and the XOR transformation.
    ```bash
    pytest tests/test_cryptographic_function.py
    ```

## 5. Development Trajectory

### History & Chain of Thought

1.  **Task Analysis**: 
    -   Identified the need for a compliant SHA3-256 implementation.
    -   Recognized strict constraints on imports and standard library usage.

2.  **Test Development**:
    -   Created `tests/test_cryptographic_function.py`.
    -   Defined test vectors by calculating `SHA3-256(input) ^ 0xA5`.
    -   Added AST-based tests to automatically fail if forbidden code patterns were detected.

3.  **Codebase Analysis (Final State)**:
    -   **Algorithm**: Keccak-f[1600] (SHA3-256).
    -   **Padding**: `0x06` separator + `10*1` rule.
    -   **Post-Process**: XOR `0xA5`.
    -   **Result**: `Hex(SHA3-256(M) ^ 0xA5)`.
