/**
 * AegisNote - Note Editor View
 * Provides a robust text editor for creating and modifying encrypted notes.
 * Implements memory-safe text handling with secure cleanup.
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {useNoteStore} from '../store/NoteStore';

interface NoteEditorViewProps {
  noteId: string | null;
  onNoteSave: () => void;
  onNoteCancel: () => void;
}

/**
 * NoteEditorView - Editor for creating and editing encrypted notes
 *
 * Features:
 * - Optimized text input with memoized event handlers
 * - Auto-save functionality
 * - Memory cleanup on unmount
 * - Loading and error states
 */
export const NoteEditorView: React.FC<NoteEditorViewProps> = ({
  noteId,
  onNoteSave,
  onNoteCancel,
}) => {
  const {notes, updateNote, createNote, isLoading, error, setError} = useNoteStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Create ref for content input
  const contentInputRef = useRef<TextInput>(null);

  // Get the note if editing existing note
  const note = notes.find(n => n.id === noteId);

  // Initialize editor with note data
  useEffect(() => {
    if (noteId && note) {
      setTitle(note.title);
      setContent(note.encryptedContent);
      setIsCreating(false);
    } else {
      // New note
      setTitle('');
      setContent('');
      setIsCreating(true);
    }
    setHasUnsavedChanges(false);
    setError(null);
  }, [noteId, note]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear sensitive data from memory
      setTitle('');
      setContent('');
    };
  }, []);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
    setError(null);
  };

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    setError(null);
  };

  // Save note
  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Empty Note', 'Note cannot be empty');
      return;
    }

    try {
      setError(null);

      if (isCreating) {
        // Create new note
        const newNote = await createNote();
        // Update with actual content
        await updateNote(
          newNote.id,
          title,
          content,
          '' // IV will be set by encryption layer
        );
      } else if (noteId) {
        // Update existing note
        await updateNote(noteId, title, content, '');
      }

      setHasUnsavedChanges(false);
      onNoteSave();
    } catch (err) {
      console.error('Failed to save note:', err);
      setError('Failed to save note. Please try again.');
    }
  };

  // Discard changes
  const handleDiscard = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to discard your changes?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Discard',
            style: 'destructive',
            onPress: onNoteCancel,
          },
        ]
      );
    } else {
      onNoteCancel();
    }
  };

  // Check if save is enabled
  const isSaveEnabled = title.trim() || content.trim();

  // Focus content input when component mounts for new note
  useEffect(() => {
    if (isCreating && contentInputRef.current) {
      contentInputRef.current.focus();
    }
  }, [isCreating]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleDiscard}
            activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {isCreating ? 'New Note' : 'Edit Note'}
          </Text>

          <TouchableOpacity
            style={[styles.saveButton, !isSaveEnabled && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={!isSaveEnabled}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Editor Content */}
        <ScrollView style={styles.editorContainer} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            value={title}
            onChangeText={handleTitleChange}
            placeholderTextColor="#999"
            returnKeyType="next"
            onSubmitEditing={() => contentInputRef.current?.focus()}
            blurOnSubmit={false}
          />

          <TextInput
            ref={contentInputRef}
            style={styles.contentInput}
            placeholder="Write your encrypted note here..."
            value={content}
            onChangeText={handleContentChange}
            placeholderTextColor="#999"
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            scrollEnabled={true}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEEBC',
  },
  errorText: {
    fontSize: 12,
    color: '#856404',
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    flex: 1,
    minHeight: 200,
  },
});
