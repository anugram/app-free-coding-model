/**
 * AegisNote - Secure Key Manager React Native Bridge
 * Provides JavaScript access to platform-native keychain/keystore
 */

import {NativeModules, Platform} from 'react-native';

interface RNSecureKeyManagerType {
  generateAndStoreKey: () => Promise<boolean>;
  retrieveKey: () => Promise<string | null>;
  hasKey: () => Promise<boolean>;
  deleteKey: () => Promise<boolean>;
  getKeyAlias: () => Promise<string>;
}

const RNSecureKeyManager = NativeModules.RNSecureKeyManager as RNSecureKeyManagerType;

export default RNSecureKeyManager;
