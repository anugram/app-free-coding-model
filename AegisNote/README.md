# AegisNote - Privacy-First Mobile Assistant

A cross-platform mobile productivity assistant with 100% on-device machine learning inference for text processing and a robust sensitive data discovery/redaction engine.

## Features

- **Secure Vault Notebook**: Encrypted note storage using SQLCipher (AES-256-GCM)
- **On-Device Sensitive Data Discovery**: Real-time PII, financial, and API key detection
- **Cloud Bridge Redaction**: Secure pipeline for sending text to cloud APIs while keeping PII local
- **Cross-Platform**: Single codebase for iOS and Android

## Tech Stack

- **Frontend**: React Native with TypeScript
- **Database**: SQLCipher (Encrypted SQLite)
- **Key Management**: iOS Keychain / Android Keystore
- **ML Inference**: TensorFlow Lite / ExecuTorch (planned)
- **Shared Core**: TypeScript modules for cross-platform reuse

## Project Structure

```
AegisNote/
├── android/                    # Android native code
│   ├── SecureKeyManager.kt     # Android Keystore integration
│   └── ReactNativeSecureKeyManager.java
├── ios/                        # iOS native code
│   ├── SecureKeyManager.swift  # iOS Keychain integration
│   └── RNSecureKeyManager.m
├── src/
│   ├── common/                 # Shared constants and utilities
│   ├── core/                   # Core business logic
│   │   ├── SecureKeyManager.ts # Key management
│   │   ├── database/           # SQLCipher storage
│   │   ├── redaction/          # Cloud bridge redaction service
│   │   └── sdd/                # Sensitive data discovery engine
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── App.tsx                 # Main application component
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- React Native CLI >= 13.0.0
- Xcode >= 15.0 (for iOS)
- Android Studio >= 2023.1 (for Android)

### Installation

```bash
# Navigate to the project directory
cd AegisNote

# Install dependencies
npm install

# Install iOS pods (if on macOS)
cd ios && pod install && cd ..
```

### Running the App

```bash
# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Architecture Highlights

### Secure Key Management
The application uses platform-native secure enclaves (Keychain/Keystore) to store the 256-bit AES database encryption key. This ensures the key is hardware-backed and protected against extraction.

### Encrypted Storage
All notes are encrypted at rest using SQLCipher with AES-256-GCM. The encryption key is never stored in plaintext on the device.

### Cloud Bridge Redaction
When sending text to cloud APIs:
1. Sensitive entities are identified using the SDD engine
2. Entities are replaced with deterministic placeholders
3. Mapping is stored locally in memory
4. Redacted text is sent to the API
5. Response is re-hydrated before display

## Memory Security
- Decrypted notes are flushed from memory when the app goes to background
- ML models are unloaded on memory warnings
- Secure memory clearing utilities are provided for sensitive data

## License

MIT License - See LICENSE file for details.
