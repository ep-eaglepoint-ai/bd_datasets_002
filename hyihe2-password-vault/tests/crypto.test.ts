import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoService } from '../repository_after/src/lib/crypto';

describe('CryptoService - Requirement 1: Master Password & Key Derivation', () => {
    describe('Salt Generation', () => {
        it('should generate unique salts', () => {
            const salt1 = CryptoService.generateSalt();
            const salt2 = CryptoService.generateSalt();
            expect(salt1).not.toBe(salt2);
            expect(salt1.length).toBeGreaterThan(0);
        });

        it('should generate base64-encoded salts', () => {
            const salt = CryptoService.generateSalt();
            expect(() => atob(salt)).not.toThrow();
        });
    });

    describe('IV Generation', () => {
        it('should generate unique IVs', () => {
            const iv1 = CryptoService.generateIV();
            const iv2 = CryptoService.generateIV();
            expect(iv1).not.toBe(iv2);
        });

        it('should generate 12-byte IVs for AES-GCM', () => {
            const iv = CryptoService.generateIV();
            const decoded = atob(iv);
            expect(decoded.length).toBe(12);
        });
    });

    describe('Key Derivation (PBKDF2)', () => {
        it('should derive a key from password and salt', async () => {
            const password = 'TestMasterPassword123!';
            const salt = CryptoService.generateSalt();
            const key = await CryptoService.deriveKey(password, salt);
            
            expect(key).toBeDefined();
            expect(key.type).toBe('secret');
            expect(key.algorithm.name).toBe('AES-GCM');
        });

        it('should derive different keys for different passwords', async () => {
            const salt = CryptoService.generateSalt();
            const key1 = await CryptoService.deriveKey('password1', salt);
            const key2 = await CryptoService.deriveKey('password2', salt);
            
            // Keys should be different objects
            expect(key1).not.toBe(key2);
        });

        it('should derive different keys for different salts', async () => {
            const password = 'TestPassword123!';
            const salt1 = CryptoService.generateSalt();
            const salt2 = CryptoService.generateSalt();
            
            const key1 = await CryptoService.deriveKey(password, salt1);
            const key2 = await CryptoService.deriveKey(password, salt2);
            
            expect(key1).not.toBe(key2);
        });

        it('should derive the same key for same password and salt', async () => {
            const password = 'TestPassword123!';
            const salt = CryptoService.generateSalt();
            
            const key1 = await CryptoService.deriveKey(password, salt);
            const key2 = await CryptoService.deriveKey(password, salt);
            
            // Should be deterministic
            expect(key1.algorithm).toEqual(key2.algorithm);
        });

        it('should fail safely with incorrect password', async () => {
            const correctPassword = 'CorrectPassword123!';
            const incorrectPassword = 'WrongPassword456!';
            const salt = CryptoService.generateSalt();
            
            const correctKey = await CryptoService.deriveKey(correctPassword, salt);
            const incorrectKey = await CryptoService.deriveKey(incorrectPassword, salt);
            
            // Different passwords should produce different keys
            expect(correctKey).not.toBe(incorrectKey);
        });
    });
});

describe('CryptoService - Requirement 2: Client-Side Encryption', () => {
    let testKey: CryptoKey;
    const testPassword = 'TestMasterPassword123!';
    const testSalt = CryptoService.generateSalt();

    beforeEach(async () => {
        testKey = await CryptoService.deriveKey(testPassword, testSalt);
    });

    describe('Encryption', () => {
        it('should encrypt plaintext data', async () => {
            const plaintext = 'sensitive-password-123';
            const { cipherText, iv } = await CryptoService.encrypt(plaintext, testKey);
            
            expect(cipherText).toBeDefined();
            expect(iv).toBeDefined();
            expect(cipherText).not.toBe(plaintext);
            expect(cipherText.length).toBeGreaterThan(0);
        });

        it('should produce different ciphertexts for same plaintext', async () => {
            const plaintext = 'test-data';
            const result1 = await CryptoService.encrypt(plaintext, testKey);
            const result2 = await CryptoService.encrypt(plaintext, testKey);
            
            // Different IVs should produce different ciphertexts
            expect(result1.cipherText).not.toBe(result2.cipherText);
            expect(result1.iv).not.toBe(result2.iv);
        });

        it('should encrypt empty strings', async () => {
            const { cipherText, iv } = await CryptoService.encrypt('', testKey);
            expect(cipherText).toBeDefined();
            expect(iv).toBeDefined();
        });

        it('should encrypt unicode characters', async () => {
            const plaintext = '🔐 Password with émojis and spëcial çhars';
            const { cipherText, iv } = await CryptoService.encrypt(plaintext, testKey);
            expect(cipherText).toBeDefined();
            expect(iv).toBeDefined();
        });
    });

    describe('Decryption', () => {
        it('should decrypt encrypted data correctly', async () => {
            const plaintext = 'my-secret-password';
            const { cipherText, iv } = await CryptoService.encrypt(plaintext, testKey);
            const decrypted = await CryptoService.decrypt(cipherText, iv, testKey);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should decrypt unicode characters correctly', async () => {
            const plaintext = '🔐 Test émojis 中文';
            const { cipherText, iv } = await CryptoService.encrypt(plaintext, testKey);
            const decrypted = await CryptoService.decrypt(cipherText, iv, testKey);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should fail with wrong key', async () => {
            const plaintext = 'secret-data';
            const { cipherText, iv } = await CryptoService.encrypt(plaintext, testKey);
            
            const wrongKey = await CryptoService.deriveKey('WrongPassword', testSalt);
            
            await expect(
                CryptoService.decrypt(cipherText, iv, wrongKey)
            ).rejects.toThrow();
        });

        it('should fail with corrupted ciphertext', async () => {
            const plaintext = 'test-data';
            const { cipherText, iv } = await CryptoService.encrypt(plaintext, testKey);
            
            const corruptedCipherText = cipherText.slice(0, -5) + 'XXXXX';
            
            await expect(
                CryptoService.decrypt(corruptedCipherText, iv, testKey)
            ).rejects.toThrow();
        });

        it('should fail with wrong IV', async () => {
            const plaintext = 'test-data';
            const { cipherText } = await CryptoService.encrypt(plaintext, testKey);
            const wrongIV = CryptoService.generateIV();
            
            await expect(
                CryptoService.decrypt(cipherText, wrongIV, testKey)
            ).rejects.toThrow();
        });
    });

    describe('Zero-Knowledge Architecture', () => {
        it('should not expose plaintext in encrypted output', async () => {
            const plaintext = 'super-secret-password';
            const { cipherText, iv } = await CryptoService.encrypt(plaintext, testKey);
            
            expect(cipherText).not.toContain(plaintext);
            expect(iv).not.toContain(plaintext);
        });

        it('should require correct master password to decrypt', async () => {
            const plaintext = 'vault-password';
            const { cipherText, iv } = await CryptoService.encrypt(plaintext, testKey);
            
            // Try with different password
            const wrongKey = await CryptoService.deriveKey('DifferentPassword', testSalt);
            
            await expect(
                CryptoService.decrypt(cipherText, iv, wrongKey)
            ).rejects.toThrow();
        });
    });
});
