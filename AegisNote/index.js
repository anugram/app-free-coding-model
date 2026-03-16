/**
 * AegisNote - Privacy-first mobile productivity assistant
 * Entry point
 */

// Polyfill TextEncoder/TextDecoder for React Native
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
import {SecureKeyManager} from './src/core/SecureKeyManager';
import {NoteProvider} from './src/context/NoteProvider';
import {telemetryManager} from './src/core/Telemetry/TelemetryManager';

// Sentry configuration
const SENTRY_DSN = __DEV__
  ? '' // Disable Sentry in development
  : 'https://examplePublicKey@o0.ingest.sentry.io/0'; // Replace with actual DSN

// Create key manager instance
const keyManager = SecureKeyManager.getInstance();

// Initialize telemetry
const initTelemetry = async () => {
  try {
    await telemetryManager.initialize({
      dsn: SENTRY_DSN,
      errorSampleRate: 1.0, // Send all errors in production
      performanceSampleRate: 0.1, // Sample performance data
      debug: __DEV__, // Enable debug logs in dev
    });
    console.log('[Entry] Telemetry initialized');
  } catch (error) {
    console.error('[Entry] Failed to initialize telemetry:', error);
  }
};

// Initialize telemetry before app starts
initTelemetry();

// Create wrapped app component
const AegisNoteApp = () => (
  <NoteProvider keyManager={keyManager}>
    <App />
  </NoteProvider>
);

AppRegistry.registerComponent(appName, () => AegisNoteApp);

// Simple TextEncoder/TextDecoder polyfills for React Native
class TextEncoder {
  encode(input) {
    const bytes = [];
    for (let i = 0; i < input.length; i++) {
      let codePoint = input.codePointAt(i);
      if (codePoint === undefined) continue;

      if (codePoint < 0x80) {
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        bytes.push(0xc0 | (codePoint >> 6));
        bytes.push(0x80 | (codePoint & 0x3f));
      } else if (codePoint < 0x10000) {
        bytes.push(0xe0 | (codePoint >> 12));
        bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
        bytes.push(0x80 | (codePoint & 0x3f));
      } else {
        bytes.push(0xf0 | (codePoint >> 18));
        bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
        bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
        bytes.push(0x80 | (codePoint & 0x3f));
      }
    }
    return new Uint8Array(bytes);
  }
}

class TextDecoder {
  decode(input) {
    let result = '';
    let i = 0;
    while (i < input.length) {
      let byte = input[i];
      let codePoint;
      let bytesToRead = 0;

      if (byte < 0x80) {
        codePoint = byte;
        bytesToRead = 0;
      } else if (byte < 0xe0) {
        codePoint = byte & 0x1f;
        bytesToRead = 1;
      } else if (byte < 0xf0) {
        codePoint = byte & 0x0f;
        bytesToRead = 2;
      } else {
        codePoint = byte & 0x07;
        bytesToRead = 3;
      }

      i++;
      while (bytesToRead > 0 && i < input.length) {
        codePoint = (codePoint << 6) | (input[i] & 0x3f);
        i++;
        bytesToRead--;
      }

      if (codePoint < 0x10000) {
        result += String.fromCharCode(codePoint);
      } else {
        codePoint -= 0x10000;
        result += String.fromCharCode(
          0xd800 | (codePoint >> 10),
          0xdc00 | (codePoint & 0x3ff),
        );
      }
    }
    return result;
  }
}
