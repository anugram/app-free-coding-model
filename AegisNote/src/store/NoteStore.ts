/**
 * AegisNote - Note Store (State Management)
 * Implements reactive state management for note operations using Zustand.
 * Includes memory security features to flush decrypted notes when app goes to background.
 */

import {create} from 'zustand';

import {SecureStorageRepository} from '../core/database/SecureStorageRepository';
import {SecureKeyManager} from '../core/SecureKeyManager';
import {Note} from '../types';

/**
 * Generate a UUID v4 string (fallback for React Native without crypto)
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// State interface
interface NoteState {
  // Data
  notes: Note[];
  selectedNoteId: string | null;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Derived state
  hasNotes: boolean;

  // Actions
  setKeyManager(keyManager: SecureKeyManager): void;
  initialize(): Promise<void>;
  loadNotes(): Promise<void>;
  selectNote(noteId: string | null): void;
  createNote(): Promise<Note>;
  updateNote(noteId: string, title: string, content: string, iv: string): Promise<void>;
  deleteNote(noteId: string): Promise<void>;
  flushMemory(): Promise<void>;
  setError(error: string | null): void;
}

// Repository instance (lazy-initialized)
let repository: SecureStorageRepository | null = null;

const initializeRepository = async (keyManager: SecureKeyManager): Promise<SecureStorageRepository> => {
  if (!repository) {
    repository = SecureStorageRepository.getInstance(keyManager);
    await repository.initialize();
  }
  return repository;
};

/**
 * Note Store - Zustand store for managing notes state
 * Features:
 * - Reactive state updates with Zustand
 * - Memory security: flushes decrypted notes when app goes to background
 * - Centralized note CRUD operations
 */
export const useNoteStore = create<NoteState & {keyManager: SecureKeyManager | null; setKeyManager: (keyManager: SecureKeyManager) => void}>(
  (set, get) => ({
    // Initial state
    notes: [],
    selectedNoteId: null,
    isLoading: true,
    isSaving: false,
    error: null,
    keyManager: null,

    // Derived state
    get hasNotes() {
      return get().notes.length > 0;
    },

    // Initialize store with key manager
    setKeyManager: (keyManager: SecureKeyManager) => set({keyManager}),

    // Initialize the storage repository
    initialize: async () => {
      const {keyManager} = get();
      if (!keyManager) {
        set({error: 'Key manager not initialized'});
        return;
      }

      try {
        set({isLoading: true, error: null});
        await initializeRepository(keyManager);
        await get().loadNotes();
      } catch (error) {
        console.error('Failed to initialize store:', error);
        set({error: 'Failed to initialize secure storage'});
      } finally {
        set({isLoading: false});
      }
    },

    // Load all notes from secure storage
    loadNotes: async () => {
      const {keyManager} = get();
      if (!repository && keyManager) {
        await initializeRepository(keyManager);
      }

      try {
        set({isLoading: true, error: null});
        if (repository) {
          const notes = await repository.getAllNotes();
          set({notes, isLoading: false});
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
        set({error: 'Failed to load notes', isLoading: false});
      }
    },

    // Select a note for editing
    selectNote: (noteId: string | null) => {
      set({selectedNoteId: noteId});
    },

    // Create a new note
    createNote: async (): Promise<Note> => {
      const {keyManager} = get();
      if (!keyManager) {
        throw new Error('Key manager not initialized');
      }

      try {
        set({isSaving: true, error: null});

        if (!repository && keyManager) {
          await initializeRepository(keyManager);
        }

        // Create a new note with empty content (will be encrypted on update)
        const newNote: Note = {
          id: generateUUID(),
          title: 'New Note',
          encryptedContent: '',
          iv: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        if (repository) {
          const createdNote = await repository.createNote({
            title: newNote.title,
            encryptedContent: newNote.encryptedContent,
            iv: newNote.iv,
          });

          set(state => ({
            notes: [createdNote, ...state.notes],
            selectedNoteId: createdNote.id,
            isSaving: false,
          }));

          return createdNote;
        }

        // Fallback if repository not available
        set(state => ({
          notes: [newNote, ...state.notes],
          selectedNoteId: newNote.id,
          isSaving: false,
        }));

        return newNote;
      } catch (error) {
        console.error('Failed to create note:', error);
        set({isSaving: false, error: 'Failed to create note'});
        throw error;
      }
    },

    // Update an existing note
    updateNote: async (noteId: string, title: string, content: string, iv: string) => {
      const {keyManager} = get();
      if (!keyManager) {
        throw new Error('Key manager not initialized');
      }

      try {
        set({isSaving: true, error: null});

        if (!repository && keyManager) {
          await initializeRepository(keyManager);
        }

        if (repository) {
          // Get existing note to preserve createdAt
          const existingNote = await repository.getNote(noteId);
          const updatedAt = Date.now();

          const updatedNote: Note = {
            id: noteId,
            title,
            encryptedContent: content,
            iv,
            createdAt: existingNote?.createdAt || updatedAt,
            updatedAt,
          };

          await repository.updateNote(updatedNote);

          set(state => ({
            notes: state.notes.map(n =>
              n.id === noteId ? updatedNote : n
            ),
            isSaving: false,
          }));
        }
      } catch (error) {
        console.error('Failed to update note:', error);
        set({isSaving: false, error: 'Failed to update note'});
        throw error;
      }
    },

    // Delete a note
    deleteNote: async (noteId: string) => {
      const {keyManager} = get();
      if (!keyManager) {
        throw new Error('Key manager not initialized');
      }

      try {
        set({isSaving: true, error: null});

        if (!repository && keyManager) {
          await initializeRepository(keyManager);
        }

        if (repository) {
          await repository.deleteNote(noteId);

          set(state => ({
            notes: state.notes.filter(n => n.id !== noteId),
            selectedNoteId: state.selectedNoteId === noteId ? null : state.selectedNoteId,
            isSaving: false,
          }));
        }
      } catch (error) {
        console.error('Failed to delete note:', error);
        set({isSaving: false, error: 'Failed to delete note'});
        throw error;
      }
    },

    // Security: Flush all decrypted notes from memory
    flushMemory: async () => {
      console.log('[NoteStore] Flushing memory - clearing decrypted notes');
      set({notes: [], selectedNoteId: null, error: null});

      if (repository) {
        try {
          await repository.close();
        } catch (error) {
          console.error('Error closing repository during flush:', error);
        }
        repository = null;
      }
    },

    // Set error state
    setError: (error: string | null) => {
      set({error});
    },
  })
);

// DevTools removed - not available in Zustand v5

// Background event handler for memory security
// Call this when the app goes to background (iOS/Android)
export const handleAppBackground = async () => {
  console.log('[Security] App going to background - flushing sensitive data');
  await useNoteStore.getState().flushMemory();
};

// Cleanup on app unmount
export const cleanupNoteStore = () => {
  if (repository) {
    repository.close();
    repository = null;
  }
};
