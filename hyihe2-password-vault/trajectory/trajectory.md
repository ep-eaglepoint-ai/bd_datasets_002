# Trajectory: Actions Taken to Build a Secure Offline Password Vault

This document outlines the specific architectural and engineering actions taken to ensure high-fidelity security, reliability, and offline-first persistence for the password vault.

## Action 1: Implement Zero-Knowledge Key Derivation & Rotation
**Issue**: Storing master passwords or exposing data to re-encryption overhead during password changes.

*   **Action Taken**: Implemented a dual-key derivation strategy using PBKDF2 and DEK wrapping.
    *   Used `PBKDF2-HMAC-SHA256` with 600,000 iterations to derive a Key Encryption Key (KEK) from the user's master password.
    *   Generated a cryptographically strong random Data Encryption Key (DEK).
    *   The DEK is encrypted by the KEK and stored in IndexedDB. All vault items are then encrypted using the DEK.
    *   This allows the user to change their master password by simply re-encrypting the DEK, rather than re-encrypting the entire vault.
*   **Reference**: 
    *   **[OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)** - Standard for secure iteration counts and salt handling.
    *   **[Web Crypto API: PBKDF2](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey)** - Leveraged for browser-native, high-performance derivation.

## Action 2: Secure Memory Management via Deterministic Auto-Lock
**Issue**: Sensitive cryptographic material (DEK) lingering in memory after user inactivity, increasing exposure to memory scraping.

*   **Action Taken**: Implemented a Zustand-based state machine with automated memory wiping.
    *   Developed a `touchActivity` trigger that updates a `lastActivity` timestamp on every user interaction.
    *   Added a `checkAutoLock` utility that compares elapsed time against user-configured timeouts.
    *   On lock, the `encryptionKey` (DEK) is explicitly set to `null` to ensure the JavaScript engine marks the sensitive key for garbage collection.
*   **Reference**: 
    *   **[Zustand: Middleware and State Management](https://github.com/pmndrs/zustand)** - Used to ensure state transitions (locked -> unlocked) are atomic and consistent.

## Action 3: Resolve SSR-Initialization Failures for Browser APIs
**Issue**: Next.js server-side rendering (SSR) attempted to access `indexedDB` at build-time, causing fatal crashes.

*   **Action Taken**: Implemented lazy-initialization and environment checks.
    *   Wrapped all `idb` operations in a `typeof window !== "undefined"` conditional.
    *   Refactored `StorageService` to use a lazy-promise pattern (`get dbPromise()`) that only instantiates the database connection on the first client-side access.
*   **Reference**: 
    *   **[Next.js Documentation: Dynamic Imports and Client-only Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)** - Guided the isolation of browser-dependent modules.

## Action 4: Enable Hermetic Test Execution for Browser-Only Logic
**Issue**: Test runner (Vitest/Node) lacked access to browser APIs (`indexedDB`, `CryptoKey`), preventing automated verification.

*   **Action Taken**: Integrated technical polyfills and mock services.
    *   Configured `fake-indexeddb` in `tests/setup.ts` to provide a fully functional, in-memory IndexedDB for the Node environment.
    *   Updated tests to use `await import()` for storage to ensure polyfills are loaded before service instantiation.
*   **Reference**: 
    *   **[W3C IndexedDB Spec](https://www.w3.org/TR/IndexedDB/)** - Consulted to ensure `fake-indexeddb` parity with browser behavior.

## Verification Action: Automated Security & Export Validation
**Action Taken**: Developed a comprehensive suite of behavioral and structural tests.
*   Implemented 10 TypeScript tests in `vault.test.ts` covering requirements 3, 9, 10, 13, and 16.
*   Verified that `exportVault` properly retrieves items from storage by adding `storage.saveItem` pre-conditions in the test environment.
*   Used `expect(state.encryptionKey).toBeNull()` to verify memory hygiene after auto-lock triggers.
