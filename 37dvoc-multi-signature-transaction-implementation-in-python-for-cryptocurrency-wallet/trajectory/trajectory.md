# Trajectory

1. **Requirements & Input Analysis** — I started by reading the project requirements to understand what needed to be built: a 2-of-3 multi-signature transaction system for a cryptocurrency wallet. The requirements specified secure key generation using secp256k1 with cryptographic randomness, partial signature creation and aggregation, replay attack prevention via nonce uniqueness, constant-time comparisons for secret handling, signature normalization to prevent malleability, and clear error handling without leaking sensitive information. I noted the `ecdsa` library was pre-specified.
   - Resource: [ecdsa library documentation](https://github.com/tlsfuzzer/python-ecdsa)
   - Resource: [secp256k1 curve parameters](https://en.bitcoin.it/wiki/Secp256k1)
   - Resource: [RFC 6979 - Deterministic ECDSA](https://datatracker.ietf.org/doc/html/rfc6979)

2. **Domain Model Scaffolding** — I designed the module structure before writing code, identifying the core entities and their relationships. The architecture includes: `exceptions.py` for custom error hierarchy, `key_management.py` for KeyPair with secp256k1, `validation.py` for input validation and NonceRegistry, `transaction.py` for Transaction/TransactionPayload/PartialSignature/SignedTransaction dataclasses, `signing.py` for signature creation with low-S normalization, `coordinator.py` for SignatureCoordinator that verifies and aggregates signatures, and `wallet.py` for the main MultiSigWallet interface.
   - Resource: [Python dataclasses documentation](https://docs.python.org/3/library/dataclasses.html)
   - Resource: [BIP-62 Transaction Malleability](https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki)

3. **Implementation** — I implemented each module following the security constraints: key generation uses `os.urandom(32)` for 256 bits of entropy, signing uses `sign_deterministic()` with SHA256 for RFC 6979 compliance, signature normalization enforces s ≤ n/2 (low-S form), secret comparisons use `hmac.compare_digest()`, and NonceRegistry uses thread-safe locking to prevent replay attacks. The coordinator verifies each partial signature before accepting it and enforces the 2-of-3 threshold. All exceptions inherit from MultiSigError and never expose private keys in messages.
   - Resource: [os.urandom documentation](https://docs.python.org/3/library/os.html#os.urandom)
   - Resource: [hmac.compare_digest](https://docs.python.org/3/library/hmac.html#hmac.compare_digest)
   - Resource: [Bitcoin address derivation](https://en.bitcoin.it/wiki/Technical_background_of_version_1_Bitcoin_addresses)

4. **Verification & Correctness** — I created a comprehensive test suite with 92 tests covering all security requirements. The `conftest.py` uses `TARGET_REPOSITORY` environment variable for dynamic module loading, allowing the same tests to run against both repository states. I configured Docker with `test-after` and `evaluation` services, then ran `docker compose run --rm test-after` to verify all tests pass, and the evaluation script generates a successful `report.json`.
   - Resource: [pytest fixtures documentation](https://docs.pytest.org/en/stable/explanation/fixtures.html)
   - Resource: [Docker Compose documentation](https://docs.docker.com/compose/)

5. **Style & Maintainability Review** — Finally, I reviewed the code for maintainability: simplified verbose docstrings to be concise and natural, ensured consistent coding style across all modules, and verified that no secrets appear in logs, errors, or string representations. The `__repr__` and `__str__` methods in KeyPair only show truncated public key hex, never private keys.
   - Resource: [Python style guide (PEP 8)](https://peps.python.org/pep-0008/)
