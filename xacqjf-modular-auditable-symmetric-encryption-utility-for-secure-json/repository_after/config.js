/**
 * Configuration constants for the encryption utility.
 * Defines algorithm parameters, key sizes, and scrypt settings.
 */

const CONFIG = {
    // Cryptographic algorithm (AES-256-GCM)
    ALGORITHM: 'aes-256-gcm',

    // Envelope Version Identifier
    VERSION: 'v1',

    // Byte sizes for cryptographic artifacts
    SIZES: {
        KEY: 32,   // 256 bits
        SALT: 32,  // 256 bits
        NONCE: 12, // 96 bits
        TAG: 16    // 128 bits
    },

    // Key Derivation Function (Scrypt) parameters
    SCRYPT: {
        N: 32768,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024 // 64MB
    }
};

module.exports = CONFIG;
