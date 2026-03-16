declare module 'react-native-fast-crypto' {
  export interface EncryptResult {
    ciphertext: Uint8Array;
    tag: Uint8Array;
  }

  export interface FastCrypto {
    aes256GcmEncrypt(
      plaintext: Uint8Array,
      key: Uint8Array,
      iv: Uint8Array,
    ): Promise<EncryptResult>;
    aes256GcmDecrypt(
      ciphertext: Uint8Array,
      key: Uint8Array,
      iv: Uint8Array,
      tag: Uint8Array,
    ): Promise<Uint8Array>;
    aes256CbcEncrypt(
      plaintext: Uint8Array,
      key: Uint8Array,
      iv: Uint8Array,
    ): Promise<{ciphertext: Uint8Array}>;
    aes256CbcDecrypt(
      ciphertext: Uint8Array,
      key: Uint8Array,
      iv: Uint8Array,
    ): Promise<Uint8Array>;
    randomBytes(buffer: Uint8Array): Promise<void>;
  }

  export const FastCrypto: FastCrypto;

  export default FastCrypto;
}
