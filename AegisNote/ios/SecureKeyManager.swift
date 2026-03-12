//
//  SecureKeyManager.swift
//  AegisNote
//
//  Manages iOS Keychain access for database encryption key storage.
//  Uses SecKey generation with hardware-backed security when available.
//

import Foundation
import Security

class SecureKeyManager: NSObject {

    static let shared = SecureKeyManager()
    private let keyAlias = "aegisnote_db_key"

    // Key parameters for AES-256 generation
    private let keyAttributes: [String: Any] = [
        kSecAttrApplicationTag as String: keyAlias,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
        kSecAttrKeySizeInBits as String: 256,
        kSecPrivateKeyAttrs as String: [
            kSecAttrIsPermanent as String: true,
            kSecAttrApplicationTag as String: keyAlias
        ]
    ]

    /// Generate a new 256-bit AES key and store it in Keychain
    /// Returns true if successful, false if key already exists or error occurred
    func generateAndStoreKey() -> Bool {
        // Check if key already exists
        if hasKey() {
            return false
        }

        // Generate random key data
        let keySize = 32 // 256 bits
        var keyData = Data(count: keySize)
        let result = keyData.withUnsafeMutableBytes { bytes in
            let status = SecRandomCopyBytes(kSecRandomDefault, keySize, bytes.baseAddress!)
            return status == errSecSuccess
        }

        if !result {
            return false
        }

        // Store in Keychain
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrKeyClass as String: kSecAttrKeyClassSymmetric,
            kSecAttrApplicationTag as String: keyAlias,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            kSecValueData as String: keyData,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrEffectiveKeySize as String: 256
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    /// Retrieve the stored AES key from Keychain
    /// Returns base64-encoded key string or nil if not found
    func retrieveKey() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrKeyClass as String: kSecAttrKeyClassSymmetric,
            kSecAttrApplicationTag as String: keyAlias,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecSuccess, let keyData = result as? Data {
            return keyData.base64EncodedString()
        }

        return nil
    }

    /// Check if a key exists in Keychain
    func hasKey() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrKeyClass as String: kSecAttrKeyClassSymmetric,
            kSecAttrApplicationTag as String: keyAlias,
            kSecReturnData as String: false
        ]

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    /// Delete the key from Keychain
    func deleteKey() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrKeyClass as String: kSecAttrKeyClassSymmetric,
            kSecAttrApplicationTag as String: keyAlias
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }

    /// Key alias for identification
    func getKeyAlias() -> String {
        return keyAlias
    }
}
