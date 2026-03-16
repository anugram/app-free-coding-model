/**
 * AegisNote - Main Application Component
 *
 * Entry point for the React Native application.
 * Implements the Secure Vault Notebook UI for creating and managing encrypted notes.
 * Uses Zustand for reactive state management and NoteProvider for context.
 */

import React, {useState, useCallback, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Platform,
  StatusBar,
} from 'react-native';
import {SecureKeyManager} from './core/SecureKeyManager';
import {NoteProvider} from './context/NoteProvider';
import {NoteListView} from './views/NoteListView';
import {NoteEditorView} from './views/NoteEditorView';
import {useNoteStore} from './store/NoteStore';

// Create key manager instance
const keyManager = SecureKeyManager.getInstance();

/**
 * Splash Screen Component
 * Shows app branding while initializing
 */
function SplashScreen({onReady}: {onReady: () => void}) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Animation duration
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onReady();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <SafeAreaView style={styles.splashContainer}>
      <View style={styles.splashContent}>
        <View style={styles.logoContainer}>
          <View style={styles.lockIcon}>
            <Text style={styles.lockIconText}>🔒</Text>
          </View>
          <Text style={styles.appName}>AegisNote</Text>
          <Text style={styles.subtitle}>Privacy-first encrypted notes</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar} />
        </View>
        <Text style={styles.loadingText}>Initializing secure vault...</Text>
      </View>
    </SafeAreaView>
  );
}

/**
 * Main App Component
 * Wraps the application with NoteProvider for state management
 */
export default function App() {
  const {isLoading, selectedNoteId, selectNote} = useNoteStore();
  const [isReady, setIsReady] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Wait for key manager to be ready
  useEffect(() => {
    const initApp = async () => {
      await keyManager.retrieveKey();
      setIsReady(true);
    };
    initApp();
  }, []);

  // Handle note selection
  const handleNoteSelect = useCallback(
    (noteId: string) => {
      selectNote(noteId);
      setIsEditing(true);
    },
    [selectNote]
  );

  // Handle creating a new note
  const handleNoteCreate = useCallback(() => {
    selectNote(null);
    setIsEditing(true);
  }, [selectNote]);

  // Handle note save completion
  const handleNoteSave = useCallback(() => {
    setIsEditing(false);
    selectNote(null);
  }, [selectNote]);

  // Handle note cancel
  const handleNoteCancel = useCallback(() => {
    setIsEditing(false);
    selectNote(null);
  }, [selectNote]);

  // Show splash screen while initializing
  if (!isReady) {
    return <SplashScreen onReady={() => setIsReady(true)} />;
  }

  // Show editor if editing, otherwise show list
  if (isEditing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <NoteEditorView
          noteId={selectedNoteId}
          onNoteSave={handleNoteSave}
          onNoteCancel={handleNoteCancel}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <NoteListView
        onNoteSelect={handleNoteSelect}
        onNoteCreate={handleNoteCreate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4a4a6a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  lockIconText: {
    fontSize: 36,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 1,
  },
  progressBarContainer: {
    width: 120,
    height: 4,
    backgroundColor: '#4a4a6a',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    width: '60%',
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    letterSpacing: 1,
  },
});
