# Trajectory: Designing a Maintainable, Auditable Application-Level Encryption Utility

This learning path follows a **first-principles trajectory** adapted from the provided *Trajectory Template*, mapped rigorously to the problem of implementing a secure, maintainable, and auditable application-level encryption utility.

---

## 0. Domain Map (What You Must Actually Understand)

Before implementation, explicitly scope the domains involved. Under-scoping is a common source of cryptographic failure.

### Domains

1. **Applied Cryptography**
   - Authenticated Encryption (AEAD)
   - Key Derivation Functions (memory-hard KDFs)
   - Salts, nonces, randomness
   - Integrity, authenticity, tamper detection

2. **Secure Data Encoding**
   - Binary vs text boundaries
   - Base64url encoding
   - Canonical and deterministic serialization

3. **Software Architecture**
   - Single Responsibility Principle
   - Explicit data contracts (envelopes)
   - Versioning and forward compatibility

4. **Defensive Programming**
   - Runtime input validation
   - Fail-closed error handling
   - Non-leaking error semantics

5. **Security-Oriented Testing**
   - Negative testing
   - Tamper simulation
   - Regression protection for security guarantees

---

## 1. Audit the Cryptographic Problem Space (Threat & Failure Analysis)

**Goal:** Understand why encryption utilities fail in practice before writing code.

### First-Principle Truths
- Encryption without authentication is insecure.
- Correct primitives can still be misused.
- Most cryptographic failures are due to API misuse, not broken algorithms.

### Tasks
- Identify common failure modes:
  - Nonce reuse
  - Missing authentication
  - Ambiguous or implicit serialization
  - Silent decoding failures
  - Weak or misconfigured KDF parameters
- Convert each failure mode into an explicit rejection condition.

### Resources
- Authenticated Encryption overview  
  https://www.youtube.com/watch?v=8h8B3Y8jX0Q
- Why AES-GCM is easy to misuse  
  https://soatok.blog/2020/05/13/why-aes-gcm-sucks/
- Real-world cryptographic failure lessons  
  https://moxie.org/2011/12/13/the-cryptopals-crypto-challenges.html

---

## 2. Define a Cryptographic Contract (Before Writing Code)

This step plays the same role as a **performance contract** in refactoring trajectories.

### Contract Elements
- Cipher: `AES-256-GCM`
- Key derivation: `scrypt`
  - Parameters: `N`, `r`, `p`, `dkLen`
- Per-message randomness:
  - Salt (for KDF)
  - Nonce (for AEAD)
- Integrity guarantees:
  - Authentication tag
  - Additional Authenticated Data (AAD)
- Failure behavior:
  - Explicit failure on all invalid conditions
  - No partial or degraded outputs

### Purpose
This contract becomes:
- A design constraint
- A security review checklist
- A regression test oracle

### Resources
- NIST AEAD reference  
  https://csrc.nist.gov/projects/block-cipher-techniques/bcm
- scrypt original paper  
  https://www.tarsnap.com/scrypt/scrypt.pdf
- Practical KDF guidance  
  https://cryptobook.nakov.com/mac-and-key-derivation/scrypt

---

## 3. Design the Envelope Schema (Cryptographic Data Model)

This is the **central architectural decision** of the system.

### First Principles
- Cryptography operates on bytes.
- Applications exchange structured text.
- Ambiguity at this boundary leads to vulnerabilities.

### Tasks
- Define a strict, self-describing envelope schema:

```text
{
  version,
  kdf,
  kdfParams,
  salt,
  cipher,
  nonce,
  aad,
  ciphertext,
  authTag
}
