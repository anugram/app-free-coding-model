/**
 * AegisNote - Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for note content.
 * Uses react-native-fast-crypto for native performance.
 */

import {FastCrypto} from 'react-native-fast-crypto';

/**
 * Encryption configuration
 */
export interface EncryptOptions {
  /**
   * Initialization vector (12 bytes recommended for GCM)
   */
  iv?: Uint8Array;

  /**
   * Additional authenticated data
   */
  aad?: Uint8Array;
}

/**
 * Encryption result containing ciphertext and metadata
 */
export interface EncryptResult {
  /**
   * Base64-encoded ciphertext
   */
  ciphertext: string;

  /**
   * Base64-encoded IV
   */
  iv: string;

  /**
   * Base64-encoded authentication tag
   */
  tag: string;
}

/**
 * Decryption result
 */
export interface DecryptResult {
  /**
   * Decrypted plaintext
   */
  plaintext: string;
}

/**
 * Encryption Service class
 *
 * Provides secure encryption/decryption using AES-256-GCM.
 * All operations use native crypto for performance.
 */
export class EncryptionService {
  private static instance: EncryptionService;

  /**
   * Private constructor for singleton pattern.
   * Use `getInstance()` to access the service.
   */
  private constructor() {}

  /**
   * Get or create the singleton instance.
   */
  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypt data using AES-256-GCM.
   *
   * @param plaintext - The data to encrypt
   * @param key - The encryption key (32 bytes for AES-256)
   * @returns - Encryption result with ciphertext, IV, and tag
   */
  public async encrypt(
    plaintext: string,
    key: Uint8Array,
  ): Promise<EncryptResult> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a random IV (12 bytes for GCM)
    const iv = new Uint8Array(12);
    await FastCrypto.randomBytes(iv);

    // Encrypt using AES-256-GCM
    const result = await FastCrypto.aes256GcmEncrypt(data, key, iv);

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(result.ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
      tag: btoa(String.fromCharCode(...new Uint8Array(result.tag))),
    };
  }

  /**
   * Decrypt data using AES-256-GCM.
   *
   * @param ciphertext - Base64-encoded ciphertext
   * @param key - The encryption key (32 bytes for AES-256)
   * @param iv - Base64-encoded initialization vector
   * @param tag - Base64-encoded authentication tag
   * @returns - Decryption result with plaintext
   */
  public async decrypt(
    ciphertext: string,
    key: Uint8Array,
    iv: string,
    tag: string,
  ): Promise<DecryptResult> {
    // Decode base64 values
    const cipherBytes = new Uint8Array(
      atob(ciphertext).split('').map(char => char.charCodeAt(0)),
    );
    const ivBytes = new Uint8Array(
      atob(iv).split('').map(char => char.charCodeAt(0)),
    );
    const tagBytes = new Uint8Array(
      atob(tag).split('').map(char => char.charCodeAt(0)),
    );

    // Decrypt using AES-256-GCM
    const result = await FastCrypto.aes256GcmDecrypt(
      cipherBytes,
      key,
      ivBytes,
      tagBytes,
    );

    const decoder = new TextDecoder();
    return {
      plaintext: decoder.decode(result),
    };
  }

  /**
   * Simple encryption (without tag verification) for compatibility.
   * Uses AES-256-CBC as fallback.
   */
  public async encryptSimple(
    plaintext: string,
    key: Uint8Array,
  ): Promise<{ciphertext: string; iv: string}> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a random IV (16 bytes for CBC)
    const iv = new Uint8Array(16);
    await FastCrypto.randomBytes(iv);

    // Encrypt using AES-256-CBC
    const result = await FastCrypto.aes256CbcEncrypt(data, key, iv);

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(result.ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  /**
   * Simple decryption (without tag verification) for compatibility.
   */
  public async decryptSimple(
    ciphertext: string,
    key: Uint8Array,
    iv: string,
  ): Promise<string> {
    const cipherBytes = new Uint8Array(
      atob(ciphertext).split('').map(char => char.charCodeAt(0)),
    );
    const ivBytes = new Uint8Array(
      atob(iv).split('').map(char => char.charCodeAt(0)),
    );

    const result = await FastCrypto.aes256CbcDecrypt(cipherBytes, key, ivBytes);

    const decoder = new TextDecoder();
    return decoder.decode(result);
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();
