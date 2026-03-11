# Role: Cross-Platform Mobile Architect
# Epic 1: Core Architecture & Secure Data Foundation for "AegisNote"

## Objective
Set up the foundational cross-platform repository (React Native with TypeScript OR Flutter—choose the most stable for native C++/Rust bindings) and implement the secure, encrypted-at-rest local storage layer.

## Tech Stack
* **Framework:** React Native/TypeScript or Flutter
* **Database:** SQLCipher (Encrypted SQLite)
* **Key Management:** Platform-native secure enclaves (iOS Keychain, Android Keystore) via native modules.

## Epic Requirements
1. **Scaffold the App:** Initialize the cross-platform project with a clean architecture pattern (e.g., MVVM or Domain-Driven Design).
2. **Implement Secure Storage Interface:** Create an abstract storage repository class.
3. **Database Integration:** Integrate SQLCipher. The database encryption key MUST be generated on first launch and stored securely in the device's native hardware-backed keystore/keychain.
4. **CRUD Operations:** Implement basic Create, Read, Update, Delete methods for a `Note` entity (id, title, encrypted_content, timestamp).

## Your First Task
Initialize the project structure. Then, write the implementation for the `SecureKeyManager` module that interfaces with both iOS Keychain and Android Keystore to generate, store, and retrieve a 256-bit AES database encryption key. Provide the native bridging code required for this.
