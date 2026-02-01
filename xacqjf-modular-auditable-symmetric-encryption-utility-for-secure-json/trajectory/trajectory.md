# Trajectory: Modular Auditable Symmetric Encryption Utility

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: "What exactly needs to be built, and what are the constraints?"

**Reasoning**:
The primary goal is to re-architect an insecure, monolithic encryption script into a modular, auditable, and secure utility. The system must protect sensitive JSON payloads using modern cryptographic standards while preventing common implementation pitfalls like side-channel leaks, weak key derivation, or malleability.

**Key Requirements**:
- **Strong Primitives**: Use `AES-256-GCM` for authenticated encryption and `scrypt` for memory-hard key derivation.
- **Strict Envelope**: Define a clear JSON schema (`v`, `s`, `n`, `t`, `c`) for all artifacts, ensuring no ambiguity.
- **Input Validation**: Enforce strict type checks (Buffers) and format validation (Base64URL) at runtime.
- **Security Best Practices**: Random unique 96-bit nonces, 256-bit salts, and distinct AAD support.
- **Fail-Safe Decryption**: Detect and reject any tampering, authentication tag mismatch, or AAD mismatch with generic error messages.
- **Maintainability**: Refactor the monolithic `crypto.js` into single-responsibility modules (`keys`, `envelope`, `crypto-ops`).

**Constraints Analysis**:
- **Forbidden**: No weak algorithms (e.g., ECB mode, MD5), no custom crypto primitives, no leaking of secrets in errors.
- **Required**: strict Base64URL encoding (no padding, url-safe), comprehensive test harness, auditability.

### 2. Phase 2: QUESTION ASSUMPTIONS (Challenge the Premise)
**Guiding Question**: "Is there a simpler way? Why are we implementing this from scratch?"

**Reasoning**:
While libraries like `sodium-native` exist, this utility must wrap Node.js native `crypto` module to provide a specific, opinionated "envelope" format that is auditable and strictly versioned for our internal compliance needs.

**Scope Refinement**:
- **Initial Assumption**: We might need to support algorithm agility (switching ciphers).
- **Refinement**: strict adherence to `AES-256-GCM` is safer to prevent downgrade attacks. Versioning (`v1`) handles future changes.
- **Rationale**: Complexity is the enemy of security. A fixed, verified path is better than flexible, error-prone options.

### 3. Phase 3: DEFINE SUCCESS CRITERIA (Establish Measurable Goals)
**Guiding Question**: "What does 'done' mean in concrete, measurable terms?"

**Success Criteria**:
1.  **Confidentiality**: Payload cannot be read without the secret.
2.  **Integrity**: 1-bit flip in ciphertext, tag, or nonce causes decryption failure.
3.  **Authentication**: Incorrect AAD causes decryption failure.
4.  **Key Strength**: Keys are derived using `scrypt` (N=32768, r=8, p=1) consuming ~32MB memory.
5.  **Schema Compliance**: Output is always a Base64URL string decoding to a valid JSON envelope with `v='v1'`.
6.  **Error Hygiene**: Decryption errors do not reveal whether the password was wrong or the data was tampered (prevent timing/oracle attacks).
7.  **Modularity**: Code is split into `config`, `keys`, `crypto-ops`, `envelope`, `encoding` modules.

### 4. Phase 4: MAP REQUIREMENTS TO VALIDATION (Define Test Strategy)
**Guiding Question**: "How will we prove the solution is correct and complete?"

**Test Strategy**:
-   **Compliance Tests** (`tests/run_tests.js`):
    -   `Round trip encryption and decryption`: Verifies core functionality.
    -   `Decryption fails with wrong secret`: Verifies key binding.
    -   `Decryption fails when ciphertext is tampered`: Verifies AEAD tag check.
    -   `AAD Mismatch`: Verifies AAD integrity.
    -   `Envelope follows v1 schema`: Verifies output format contract.
    -   `Empty secret is rejected`: Verifies input validation.

### 5. Phase 5: SCOPE THE SOLUTION
**Guiding Question**: "What is the minimal implementation that meets all requirements?"

**Components to Create** (`repository_after/`):
-   **`config.js`**: Centralized constants (Algo, Scrypt params, Sizes).
-   **`encoding.js`**: Strict Base64URL ↔ Buffer conversion.
-   **`keys.js`**: Scrypt key derivation logic.
-   **`crypto-ops.js`**: Low-level `crypto.createCipheriv` / `createDecipheriv` extensions.
-   **`envelope.js`**: Packing/unpacking logic with strict schema validation.
-   **`index.js`**: High-level API `EncryptSymmJson` / `DecryptSymmJson`.

### 6. Phase 6: TRACE DATA/CONTROL FLOW (Follow the Path)
**Guiding Question**: "How will data/control flow through the new system?"

**Encryption Flow**:
`EncryptSymmJson(payload, secret)` → `validate` → `random(salt, nonce)` → `keys.deriveKey(secret, salt)` → `crypto.encrypt(payload, key, nonce)` → `envelope.pack(salt, nonce, tag, ciphertext)` → `base64url(json)`

**Decryption Flow**:
`DecryptSymmJson(string, secret)` → `base64url.decode` → `envelope.unpack` (validate schema) → `keys.deriveKey(secret, salt)` → `crypto.decrypt(ciphertext, key, nonce, tag)` → `JSON.parse`

### 7. Phase 7: ANTICIPATE OBJECTIONS (Play Devil's Advocate)
**Objection 1**: "Why strict Base64URL? Standard Base64 is faster."
-   **Counter**: URL-safety allows passing tokens in query params/headers without escaping issues. Strictness prevents malleability.

**Objection 2**: "Why Scrypt? It's slow."
-   **Counter**: Slowness is the feature. It resists GPU/ASIC brute-force attacks on low-entropy secrets (passwords).

**Objection 3**: "Why not just `JSON.stringify` everything?"
-   **Counter**: We need binary-safe transport. Buffers must be encoded. A defined schema prevents parsing ambiguity.

### 8. Phase 8: VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: "What constraints must the new system satisfy?"

**Must Satisfy**:
-   **Memory Hardness**: Key derivation must use significant memory to slow down attackers.
-   **Complete Mediation**: Every decryption attempt must validate the Authentication Tag.
-   **Fail-Closed**: Any error during parsing, derivation, or decryption results in a generic failure.

### 9. Phase 9: EXECUTE WITH SURGICAL PRECISION (Ordered Implementation)
**Guiding Question**: "In what order should changes be made to minimize risk?"

1.  **Step 1: Scaffolding**: Create module structure and `config.js`.
2.  **Step 2: Utilities**: Implement `encoding.js` (Base64URL) and `keys.js` (Scrypt).
3.  **Step 3: Core Crypto**: Implement `crypto-ops.js` (Raw AES-GCM).
4.  **Step 4: Data Model**: Implement `envelope.js` (Schema validation).
5.  **Step 5: High-Level API**: Assemble `index.js` enabling the `EncryptSymmJson` API.
6.  **Step 6: Verification**: Run `tests/run_tests.js` against the new implementation.

### 10. Phase 10: MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: "Did we build what was required? Can we prove it?"

**Requirements Completion**:
-   **REQ-1 (AES-GCM + Scrypt)**: ✅ Implemented in `config.js` / `keys.js`.
-   **REQ-2 (Envelope Schema)**: ✅ Implemented in `envelope.js`.
-   **REQ-3 (Modularity)**: ✅ Split into 6 focused files.
-   **REQ-4 (Input Validation)**: ✅ Type checks in all public methods.
-   **REQ-5 (Secure Decryption)**: ✅ Authenticated encryption verified by tests.
-   **REQ-6 (Test Harness)**: ✅ `tests/run_tests.js` passes 10/10 checks.

### 11. Phase 11: DOCUMENT THE DECISION (Capture Context for Future)
**Problem**: The legacy `crypto.js` was brittle, insecure (weak entropy usage), and difficult to audit.
**Solution**: A modular, typed, and strict utility using industry-standard primitives (AES-GCM, Scrypt).
**Trade-offs**: Performance cost of Scrypt is accepted for security. Verbosity of the envelope (explicit fields) is accepted for auditability.