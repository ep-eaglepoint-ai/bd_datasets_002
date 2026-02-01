/**
 * Key Derivation Module
 * Handles secure key derivation using Scrypt.
 */

const crypto = require('crypto');
const util = require('util');
const CONFIG = require('./config');

// Promisify scrypt for async usage
const scryptAsync = util.promisify(crypto.scrypt);

/**
 * Derives a cryptographic key from a secret and a salt.
 * @param {string|Buffer} secret - The high-entropy secret/password.
 * @param {Buffer} salt - The cryptographic salt.
 * @returns {Promise<Buffer>} - The derived key.
 * @throws {TypeError} - If inputs are invalid types.
 * @throws {Error} - If secret is empty.
 */
async function deriveKey(secret, salt) {
    if (!Buffer.isBuffer(salt)) {
        throw new TypeError('Salt must be a Buffer');
    }

    if (salt.length !== CONFIG.SIZES.SALT) {
        throw new Error(`Invalid salt length: expected ${CONFIG.SIZES.SALT} bytes, got ${salt.length}`);
    }

    // Validate Secret
    if (typeof secret !== 'string' && !Buffer.isBuffer(secret)) {
        throw new TypeError('Secret must be a string or a Buffer');
    }

    if (secret.length === 0) {
        throw new Error('Secret cannot be empty');
    }

    // Use scrypt with configured parameters
    // crypto.scrypt(password, salt, keylen, [options], callback)
    try {
        const key = await scryptAsync(secret, salt, CONFIG.SIZES.KEY, CONFIG.SCRYPT);
        return key;
    } catch (error) {
        throw new Error(`Key derivation failed: ${error.message}`);
    }
}

module.exports = {
    deriveKey
};
