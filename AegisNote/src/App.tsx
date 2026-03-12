/**
 * AegisNote - Main Application Component
 *
 * Entry point for the React Native application.
 * Implements the Secure Vault Notebook UI for creating and managing encrypted notes.
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import {SecureStorageRepository} from './core/database/SecureStorageRepository';
import {secureKeyManager} from './core/SecureKeyManager';
import {Note} from './types';
import {secureKeyManager as km} from './core';

// Global storage repository instance
let storageRepository: SecureStorageRepository | null = null;

// Initialize storage repository
async function initializeStorage(): Promise<SecureStorageRepository> {
  if (!storageRepository) {
    storageRepository = SecureStorageRepository.getInstance(km);
    await storageRepository.initialize();
  }
  return storageRepository;
}

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Load notes on mount
  useEffect(() => {
    loadNotes();

    // Listen for app state changes to flush memory
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Flush memory when app goes to background
  useEffect(() => {
    if (appState === 'background') {
      flushMemory();
    }
  }, [appState]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    setAppState(nextAppState);
  };

  const loadNotes = async () => {
    try {
      if (!storageRepository) {
        await initializeStorage();
      }

      const loadedNotes = await storageRepository!.getAllNotes();
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please restart the app.');
    } finally {
      setIsLoading(false);
    }
  };

  const flushMemory = async () => {
    // Clear notes from memory when app goes to background
    setNotes([]);

    // Close database connection to release encrypted data from memory
    if (storageRepository) {
      await storageRepository.close();
      storageRepository = null;
    }
  };

  const handleCreateNote = async () => {
    try {
      if (!storageRepository) {
        await initializeStorage();
      }

      // Generate a new note ID
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: 'New Note',
        encryptedContent: '', // Will be encrypted before storage
        iv: '', // Initialization vector for encryption
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Create the note
      const createdNote = await storageRepository.createNote({
        title: newNote.title,
        encryptedContent: newNote.encryptedContent,
        iv: newNote.iv,
      });

      // Update local state
      setNotes(prevNotes => [createdNote, ...prevNotes]);
    } catch (error) {
      console.error('Failed to create note:', error);
      Alert.alert('Error', 'Failed to create note.');
    }
  };

  const handleNotePress = (note: Note) => {
    // In a full implementation, this would navigate to the note editor
    // For now, just log the note ID
    console.log('Note pressed:', note.id);
  };

  const renderNoteItem = ({item}: {item: Note}) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() => handleNotePress(item)}
      activeOpacity={0.7}>
      <Text style={styles.noteTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.noteDate}>
        {new Date(item.updatedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing Secure Vault...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AegisNote</Text>
        <Text style={styles.subtitle}>Secure Encrypted Notes</Text>
      </View>

      <View style={styles.notesContainer}>
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No encrypted notes yet. Create your first secure note!
              </Text>
            </View>
          }
        />
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNote}
        activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  notesContainer: {
    flex: 1,
  },
  notesList: {
    padding: 16,
  },
  noteItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
