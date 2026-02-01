/**
 * Envelope Module
 * Handles serialization (pack) and deserialization (unpack) of the encryption envelope.
 * strictly validations schema and version.
 */

const { toBase64Url, fromBase64Url } = require('./encoding');
const CONFIG = require('./config');

/**
 * Packs cryptographic artifacts into a JSON envelope struct and returns a Base64URL string.
 * @param {Buffer} salt 
 * @param {Buffer} nonce 
 * @param {Buffer} tag 
 * @param {Buffer} ciphertext 
 * @returns {Object} - The envelope object (not stringified yet, for clarity in internal composition? 
 *                    Wait, requirement says "envelope serialization". 
 *                    The old code `_pack` returned an object. `EncryptSymmJson` returned a string.
 *                    We should probably just return the object here and let the main function encode it? 
 *                    Or encode it here?
 *                    The requirement says: "encapsulate all cryptographic artifacts ... using explicit, self-documenting field names".
 *                    I'll choose to return the raw object from a `createEnvelope` function, and a `serialize` function to stringify+b64.
 *                    Actually, simplicity is better. Let's look at the usage.
 *                    Input: buffers. Output: Base64URL string of the JSON.
 */

// We will export functions to create the structure and to parse/validate.

function validateBuffer(buf, name, size) {
    if (!Buffer.isBuffer(buf)) throw new TypeError(`${name} must be a Buffer`);
    if (buf.length !== size) throw new Error(`${name} has invalid size. Expected ${size}, got ${buf.length}`);
}

function pack(salt, nonce, tag, ciphertext) {
    // strict type checking
    validateBuffer(salt, 'Salt', CONFIG.SIZES.SALT);
    validateBuffer(nonce, 'Nonce', CONFIG.SIZES.NONCE);
    validateBuffer(tag, 'Auth Tag', CONFIG.SIZES.TAG);
    if (!Buffer.isBuffer(ciphertext)) throw new TypeError('Ciphertext must be a Buffer');

    // Create Envelope Object
    const envelope = {
        version: CONFIG.VERSION,               // Version
        salt: toBase64Url(salt),                // Salt
        nonce: toBase64Url(nonce),              // Nonce
        tag: toBase64Url(tag),                  // Tag
        ciphertext: toBase64Url(ciphertext)     // Ciphertext
    };

    return envelope;
}

function unpack(encodedEnvelope) {
    if (typeof encodedEnvelope !== 'string') {
        throw new TypeError('Encoded envelope must be a string');
    }

    // 1. Base64 Decode the outer layer? 
    // Wait, the old code did `_b64(Buffer.from(JSON.stringify(env)), 'e')`.
    // So the whole envelope is a Base64URL encoded JSON string.

    let jsonStr;
    try {
        const buf = fromBase64Url(encodedEnvelope);
        jsonStr = buf.toString('utf8');
    } catch (e) {
        throw new Error('Envelope decoding failed: Invalid Base64URL');
    }

    let envelope;
    try {
        envelope = JSON.parse(jsonStr);
    } catch (e) {
        throw new Error('Envelope decoding failed: Invalid JSON');
    }

    // Schema Validation
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
        throw new Error('Invalid envelope structure: Not an object');
    }

    // Version Check
    if (envelope.version !== CONFIG.VERSION) {
        throw new Error(`Unsupported envelope version: ${envelope.version}`);
    }

    // Required Fields Presence and Type Check (Should be strings)
    const requiredFields = ['salt', 'nonce', 'tag', 'ciphertext'];
    for (const field of requiredFields) {
        if (typeof envelope[field] !== 'string') {
            throw new Error(`Missing or invalid field in envelope: ${field}`);
        }
    }

    // Decode Fields
    try {
        const salt = fromBase64Url(envelope.salt);
        const nonce = fromBase64Url(envelope.nonce);
        const tag = fromBase64Url(envelope.tag);
        const ciphertext = fromBase64Url(envelope.ciphertext);

        // Validate Sizes
        validateBuffer(salt, 'Salt', CONFIG.SIZES.SALT);
        validateBuffer(nonce, 'Nonce', CONFIG.SIZES.NONCE);
        validateBuffer(tag, 'Auth Tag', CONFIG.SIZES.TAG);

        return { salt, nonce, tag, ciphertext };

    } catch (error) {
        throw new Error(`Envelope content invalid: ${error.message}`);
    }
}

module.exports = {
    pack,
    unpack
};
