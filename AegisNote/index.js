/**
 * AegisNote - Privacy-first mobile productivity assistant
 * Entry point
 */
import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
import {SecureKeyManager} from './src/core/SecureKeyManager';
import {NoteProvider} from './src/context/NoteProvider';

// Create key manager instance
const keyManager = SecureKeyManager.getInstance();

// Create wrapped app component
const AegisNoteApp = () => (
  <NoteProvider keyManager={keyManager}>
    <App />
  </NoteProvider>
);

AppRegistry.registerComponent(appName, () => AegisNoteApp);
