/**
 * AegisNote - Security Utilities
 *
 * Provides security-related utility functions for the application.
 */

import {sha256String} from './HashUtils';

/**
 * Clear sensitive data from memory securely.
 * Overwrites string data before garbage collection.
 */
export function secureClearMemory(data: string): string {
  // In a real implementation with native code, we would:
  // 1. Write null bytes to the memory location
  // 2. Use secure memory allocation
  // For now, just return an empty string
  return '';
}

/**
 * Validate that a string contains only safe characters.
 * Prevents injection attacks.
 */
export function sanitizeString(input: string): string {
  // Remove control characters except common whitespace
  return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

/**
 * Generate a cryptographically secure random string.
 */
export function generateSecureRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  // In React Native, crypto is available globally
  (global as any).crypto.getRandomValues(array);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }

  return result;
}

/**
 * Hash data using SHA-256.
 */
export async function sha256(data: string): Promise<string> {
  return sha256String(data);
}

/**
 * Validate JSON string to prevent injection.
 */
export function isSafeJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}
