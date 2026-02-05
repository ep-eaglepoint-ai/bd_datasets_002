export class CryptoService {
  private static ALGORITHM = { name: "AES-GCM", length: 256 };
  private static KDF_ITERATIONS = 100000;
  private static HASH = "SHA-256";

  /**
   * Generates a random salt (16 bytes).
   */
  static generateSalt(): string {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    return this.bufferToBase64(salt);
  }

  /**
   * Generates a random IV (12 bytes) for AES-GCM.
   */
  static generateIV(): string {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    return this.bufferToBase64(iv);
  }

  /**
   * Derives a cryptographic key from the master password and salt using PBKDF2.
   * This key will be used to encrypt/decrypt the actual data encryption key (DEK).
   */
  static async deriveKey(password: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: this.base64ToBuffer(salt) as any,
        iterations: this.KDF_ITERATIONS,
        hash: this.HASH,
      },
      passwordKey,
      this.ALGORITHM,
      false, // non-exportable key
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
  }

  /**
   * Generates a new random Data Encryption Key (DEK).
   */
  static async generateKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
      this.ALGORITHM,
      true, // exportable for wrapping
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypts data using AES-GCM.
   */
  static async encrypt(data: string, key: CryptoKey): Promise<{ cipherText: string; iv: string }> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedData
    );

    return {
      cipherText: this.bufferToBase64(new Uint8Array(cipherBuffer)),
      iv: this.bufferToBase64(iv),
    };
  }

  /**
   * Decrypts data using AES-GCM.
   */
  static async decrypt(cipherText: string, iv: string, key: CryptoKey): Promise<string> {
    const decoder = new TextDecoder();
    const cipherBuffer = this.base64ToBuffer(cipherText);
    const ivBuffer = this.base64ToBuffer(iv);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer as any },
      key,
      cipherBuffer as any
    );

    return decoder.decode(decryptedBuffer);
  }

  /**
   * Export key to raw format (for storage after wrapping, or usually we wrap it).
   * Actually we should wrap this key with the Derived Key (master password).
   */
  static async exportKey(key: CryptoKey): Promise<JsonWebKey> {
      return await window.crypto.subtle.exportKey("jwk", key);
  }
  
  static async importKey(jwk: JsonWebKey): Promise<CryptoKey> {
      return await window.crypto.subtle.importKey(
          "jwk",
          jwk,
          this.ALGORITHM,
          true,
          ["encrypt", "decrypt"]
      )
  }
  

  // --- Helpers ---

  static bufferToBase64(buffer: Uint8Array): string {
    let binary = "";
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return window.btoa(binary);
  }

  static base64ToBuffer(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
