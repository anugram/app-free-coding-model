/**
 * AegisNote - SHA-256 Hash Utilities
 *
 * Provides SHA-256 hashing for file integrity verification.
 */

import {FastCrypto} from 'react-native-fast-crypto';

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate SHA-256 hash of a string
 */
export async function sha256String(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  const hash = await FastCrypto.sha256(data);
  return bytesToHex(hash);
}

/**
 * Calculate SHA-256 hash of a file using streaming
 */
export async function sha256File(filePath: string): Promise<string> {
  try {
    const RNFS = require('react-native-fs');

    const chunkSize = 64 * 1024; // 64KB chunks
    let offset = 0;
    let currentHash: Uint8Array | null = null;

    const fileInfo = await RNFS.stat(filePath);
    const fileSize = fileInfo.size;

    while (offset < fileSize) {
      const bytesRead = await RNFS.read(filePath, chunkSize, offset, 'utf8');

      const encoder = new TextEncoder();
      const data = encoder.encode(bytesRead);
      const chunkHash = await FastCrypto.sha256(data);

      if (!currentHash) {
        currentHash = chunkHash;
      } else {
        const combined = new Uint8Array(currentHash.length + data.length);
        combined.set(currentHash);
        combined.set(data, currentHash.length);
        currentHash = await FastCrypto.sha256(combined);
      }

      offset += chunkSize;
    }

    return bytesToHex(currentHash || new Uint8Array(32));
  } catch (error) {
    console.error('[SHA256] Error hashing file:', error);
    throw error;
  }
}
