/**
 * Crypto Operations Module
 * Handles low-level AES-256-GCM encryption and decryption.
 */

const crypto = require('crypto');
const CONFIG = require('./config');

/**
 * Encrypts data using AES-256-GCM.
 * @param {Buffer} plaintext - Data to encrypt.
 * @param {Buffer} key - 32-byte key.
 * @param {Buffer} nonce - 12-byte nonce.
 * @param {Buffer|null} aad - Additional Authenticated Data.
 * @returns {Object} - { ciphertext, tag }
 */
function encryptRaw(plaintext, key, nonce, aad) {
    const cipher = crypto.createCipheriv(CONFIG.ALGORITHM, key, nonce);

    if (aad) {
        cipher.setAAD(aad);
    }

    const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return { ciphertext, tag };
}

/**
 * Decrypts data using AES-256-GCM.
 * @param {Buffer} ciphertext - Data to decrypt.
 * @param {Buffer} key - 32-byte key.
 * @param {Buffer} nonce - 12-byte nonce.
 * @param {Buffer} tag - 16-byte authentication tag.
 * @param {Buffer|null} aad - Additional Authenticated Data.
 * @returns {Buffer} - Decrypted plaintext.
 * @throws {Error} - If authentication fails.
 */
function decryptRaw(ciphertext, key, nonce, tag, aad) {
    const decipher = crypto.createDecipheriv(CONFIG.ALGORITHM, key, nonce);

    if (aad) {
        decipher.setAAD(aad);
    }

    decipher.setAuthTag(tag);

    // Buffer.concat is important because update might return partial?
    // Actually update returns buffer.
    const chunks = [];
    chunks.push(decipher.update(ciphertext));

    // decipher.final() will throw if auth fails
    try {
        chunks.push(decipher.final());
    } catch (err) {
        // We normalize the error message to avoid leaking internal details / consistent error handling
        throw new Error('Integrity Check Failed: Invalid Secret, Tag, or AAD');
    }

    return Buffer.concat(chunks);
}

module.exports = {
    encryptRaw,
    decryptRaw
};
