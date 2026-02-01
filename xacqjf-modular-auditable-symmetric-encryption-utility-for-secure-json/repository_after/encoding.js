/**
 * Base64URL Encoding and Decoding Utility
 * Handles conversion between Buffers and Base64URL strings.
 * Enforces strict validation of input format.
 */

/**
 * Encodes a buffer to a Base64URL string.
 * @param {Buffer} buffer - The buffer to encode.
 * @returns {string} - The Base64URL encoded string.
 * @throws {TypeError} - If input is not a buffer.
 */
function toBase64Url(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('Input must be a Buffer during Base64 encoding');
    }
    return buffer.toString('base64url');
}

/**
 * Decodes a Base64URL string to a Buffer.
 * Validates that the input strictly contains only Base64URL characters.
 * @param {string} string - The Base64URL string to decode.
 * @returns {Buffer} - The decoded buffer.
 * @throws {TypeError} - If input is not a string.
 * @throws {Error} - If input contains invalid Base64URL characters.
 */
function fromBase64Url(string) {
    if (typeof string !== 'string') {
        throw new TypeError('Input must be a string during Base64 decoding');
    }

    // Strict validation: Only A-Z, a-z, 0-9, -, _
    // Base64URL should not have padding '=' in strict implementations usually,
    // but Node's toString('base64url') strips them.
    // If we receive input with '=', strictly speaking it's not canonical Base64URL (RFC 4648).
    // The requirement says "reject malformed encoded data".
    // We will reject characters not in the set.
    if (!/^[A-Za-z0-9\-_]*$/.test(string)) {
        throw new Error('Invalid Base64URL encoding: contains invalid characters');
    }

    // Check if it is empty ??
    // The generic check might depend on context, but empty string -> empty buffer is valid.

    return Buffer.from(string, 'base64url');
}

module.exports = {
    toBase64Url,
    fromBase64Url
};
