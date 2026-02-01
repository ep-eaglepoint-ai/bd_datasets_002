/**
 * Main Entry Point
 * Orchestrates the encryption and decryption process.
 */

const crypto = require('crypto');
const CONFIG = require('./config');
const { deriveKey } = require('./keys');
const { pack, unpack } = require('./envelope');
const { encryptRaw, decryptRaw } = require('./crypto-ops');
const { toBase64Url } = require('./encoding');

/**
 * Validates and normalizes the secret.
 * @param {string} secret 
 * @returns {string} - Cleaned secret? 
 * The requirement says "rejecting empty secrets".
 * The original code did strict validation and formatting.
 * We should probably keep it strict.
 * keys.deriveKey already validates it.
 */

function validateOptions(options) {
    if (options && typeof options !== 'object' && options !== null) {
        throw new TypeError("Options must be an object");
    }
}

/**
 * Encrypts a JSON payload key-value pairs using a derived key from the secret.
 * @param {any} payload - JSON serializable payload.
 * @param {string} secret - Secret passphrase.
 * @param {Object} options - { aad: string|Buffer }
 * @returns {Promise<string>} - Base64URL encoded envelope.
 */
async function EncryptSymmJson(payload, secret, options = {}) {
    // 1. Validate Inputs
    // Payload validation: JSON.stringify will throw if circular, but we should ensure it's defined.
    if (payload === undefined) throw new Error("Payload cannot be undefined");

    validateOptions(options);

    // 2. Prepare Context
    const salt = crypto.randomBytes(CONFIG.SIZES.SALT);
    const nonce = crypto.randomBytes(CONFIG.SIZES.NONCE);

    // 3. Derive Key
    const key = await deriveKey(secret, salt);

    // 4. Serialize Payload
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');

    // 5. Encrypt
    const aad = options.aad ? Buffer.from(String(options.aad)) : null;
    const { ciphertext, tag } = encryptRaw(plaintext, key, nonce, aad);

    // 6. Pack
    const envelopeObj = pack(salt, nonce, tag, ciphertext);
    const envelopeJson = JSON.stringify(envelopeObj);

    // 7. Return Encoded Envelope
    return toBase64Url(Buffer.from(envelopeJson, 'utf8'));
}

/**
 * Decrypts an encrypted envelope string.
 * @param {string} encStr - Base64URL encoded envelope.
 * @param {string} secret - Secret passphrase.
 * @param {Object} options - { aad: string|Buffer }
 * @returns {Promise<any>} - Decrypted payload object.
 */
async function DecryptSymmJson(encStr, secret, options = {}) {
    validateOptions(options);

    // 1. Unpack and Validate Envelope
    const { salt, nonce, tag, ciphertext } = unpack(encStr);

    // 2. Derive Key
    const key = await deriveKey(secret, salt);

    // 3. Decrypt
    const aad = options.aad ? Buffer.from(String(options.aad)) : null;
    // This will throw if tag mismatches
    const plaintextBuffer = decryptRaw(ciphertext, key, nonce, tag, aad);

    // 4. Parse JSON
    try {
        return JSON.parse(plaintextBuffer.toString('utf8'));
    } catch (err) {
        throw new Error("Decryption failed: Malformed JSON payload");
    }
}

// Export the API
module.exports = {
    EncryptSymmJson,
    DecryptSymmJson
};
