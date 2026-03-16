/**
 * AegisNote - Note Provider
 * Context provider that wraps the app with NoteStore state management.
 * Handles initialization, background events, and cleanup.
 */

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { SecureKeyManager } from '../core/SecureKeyManager';
import { useNoteStore, handleAppBackground, cleanupNoteStore } from '../store/NoteStore';
import { memoryManager } from '../core/MemoryManager/MemoryWarningManager';
import { accessibilityManager } from '../core/Accessibility/AccessibilityManager';

interface NoteContextType {
  keyManager: SecureKeyManager;
  initializeStore: () => void;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export interface NoteProviderProps {
  children: React.ReactNode;
  keyManager: SecureKeyManager;
}

/**
 * NoteProvider - Context provider for NoteStore
 *
 * Features:
 * - Initializes the secure key manager and storage repository
 * - Handles app state changes (foreground/background)
 * - Flushes memory when app goes to background for security
 * - Cleans up resources on unmount
 * - Monitors memory pressure to prevent OOM crashes
 * - Manages accessibility features for screen readers
 */
export const NoteProvider: React.FC<NoteProviderProps> = ({ children, keyManager }) => {
  const { initialize, flushMemory, setKeyManager, isLoading } = useNoteStore();

  // Set key manager when provider mounts
  useEffect(() => {
    setKeyManager(keyManager);
  }, [setKeyManager, keyManager]);

  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Flush memory when app goes to background
      handleAppBackground();
      // Report inference end if app goes to background
      memoryManager.reportInferenceEnd();
    }
  }, []);

  // Initialize store on mount
  useEffect(() => {
    const initStore = async () => {
      try {
        // Initialize memory manager first
        await memoryManager.initialize();
        console.log('[NoteProvider] Memory manager initialized');

        // Initialize accessibility manager
        await accessibilityManager.initialize();
        console.log('[NoteProvider] Accessibility manager initialized');

        // Check if key exists, if not generate it
        const hasKey = await keyManager.hasKey();
        console.log('[NoteProvider] Key exists:', hasKey);
        if (!hasKey) {
          console.log('[NoteProvider] Generating new key...');
          const generated = await keyManager.generateAndStoreKey();
          console.log('Key generated:', generated);
        } else {
          console.log('[NoteProvider] Using existing key');
        }

        // Verify key was stored
        const hasKeyAfter = await keyManager.hasKey();
        console.log('[NoteProvider] Key exists after check:', hasKeyAfter);

        const key = await keyManager.retrieveKey();
        console.log('[NoteProvider] Retrieved key length:', key?.length || 0);

        await initialize();
        console.log('[NoteProvider] Store initialized successfully');
      } catch (error) {
        console.error('Failed to initialize note store:', error);
      }
    };

    initStore();

    // Listen for app state changes to flush memory
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      cleanupNoteStore();
      memoryManager.cleanup();
      accessibilityManager.cleanup();
    };
  }, [initialize]);

  // Provide initialization method to children
  const value = {
    keyManager,
    initializeStore: initialize,
  };

  return (
    <NoteContext.Provider value={value}>
      {children}
    </NoteContext.Provider>
  );
};

/**
 * useNoteContext - Hook to access note context
 *
 * Throws an error if used outside of NoteProvider
 */
export const useNoteContext = () => {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error('useNoteContext must be used within a NoteProvider');
  }
  return context;
};

/**
 * useNoteStore - Hook to access NoteStore state
 *
 * This is a re-export of the Zustand store hook for convenience
 */
export { useNoteStore };
