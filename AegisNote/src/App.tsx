/**
 * AegisNote - Main Application Component
 *
 * Entry point for the React Native application.
 * Implements the Secure Vault Notebook UI for creating and managing encrypted notes.
 * Uses Zustand for reactive state management and NoteProvider for context.
 */

import React, {useState, useCallback} from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {SecureKeyManager} from './core/SecureKeyManager';
import {NoteProvider} from './context/NoteProvider';
import {NoteListView} from './views/NoteListView';
import {NoteEditorView} from './views/NoteEditorView';
import {useNoteStore} from './store/NoteStore';

// Create key manager instance
const keyManager = new SecureKeyManager();

/**
 * Main App Component
 * Wraps the application with NoteProvider for state management
 */
export default function App() {
  return (
    <NoteProvider keyManager={keyManager}>
      <MainContent />
    </NoteProvider>
  );
}

/**
 * MainContent - Actual UI content
 * Separated to ensure NoteProvider wraps the entire app
 */
function MainContent() {
  const {selectedNoteId} = useNoteStore();
  const [isEditing, setIsEditing] = useState(false);

  // Handle note selection
  const handleNoteSelect = useCallback(
    (noteId: string) => {
      // In a full implementation with navigation, this would navigate to the editor
      // For now, we'll toggle editing mode
      setIsEditing(true);
    },
    []
  );

  // Handle creating a new note
  const handleNoteCreate = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Handle note save completion
  const handleNoteSave = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Handle note cancel
  const handleNoteCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Show editor if editing, otherwise show list
  if (isEditing) {
    return (
      <SafeAreaView style={styles.container}>
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
  },
});
