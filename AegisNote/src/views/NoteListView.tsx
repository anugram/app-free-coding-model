/**
 * AegisNote - Note List View
 * Displays a list of encrypted notes with quick access to note metadata.
 * Implements 60fps scrolling with FlatList optimization.
 */

import React, { useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNoteStore } from '../store/NoteStore';
import type { Note } from '../types';

interface NoteListViewProps {
  onNoteSelect: (noteId: string) => void;
  onNoteCreate: () => void;
}

/**
 * NoteListView - Displays all notes in a scrollable list
 *
 * Features:
 * - 60fps scrolling with FlatList
 * - Pull-to-refresh for loading newest notes
 * - Empty state with call-to-action
 * - Recent notes priority (sorted by updatedAt)
 */
export const NoteListView: React.FC<NoteListViewProps> = ({
  onNoteSelect,
  onNoteCreate,
}) => {
  const { notes, isLoading, loadNotes, flushMemory } = useNoteStore();

  // Handle note selection
  const handleNotePress = useCallback(
    (noteId: string) => {
      onNoteSelect(noteId);
    },
    [onNoteSelect]
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    await loadNotes();
  }, [loadNotes]);

  // Render individual note item
  const renderNoteItem = useCallback(
    ({ item }: { item: Note }) => {
      // Format date and time (not using useMemo here because calling hooks
      // inside callbacks violates the Rules of Hooks)
      const formattedDate = new Date(item.updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const formattedTime = new Date(item.updatedAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <TouchableOpacity
          style={styles.noteItem}
          onPress={() => handleNotePress(item.id)}
          activeOpacity={0.7}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteTitle} numberOfLines={1}>
              {item.title || 'Untitled Note'}
            </Text>
            <Text style={styles.noteTime}>
              {formattedTime}
            </Text>
          </View>
          <Text style={styles.noteDate}>{formattedDate}</Text>
        </TouchableOpacity>
      );
    },
    [handleNotePress]
  );

  // Render empty state
  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>âœŽ</Text>
        </View>
        <Text style={styles.emptyTitle}>No encrypted notes yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first secure note to get started
        </Text>
      </View>
    );
  }, []);

  // Calculate total notes count
  const noteCount = notes.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AegisNote</Text>
        <Text style={styles.subtitle}>
          {noteCount} {noteCount === 1 ? 'note' : 'notes'} secured
        </Text>
      </View>

      <View style={styles.notesContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading secure vault...</Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            renderItem={renderNoteItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.notesList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={onRefresh}
                tintColor="#007AFF"
              />
            }
            ListEmptyComponent={renderEmptyState}
            ListHeaderComponent={
              noteCount > 0 ? (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderTitle}>Recent Notes</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Floating Action Button for creating new note */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onNoteCreate}
        activeOpacity={0.8}
        accessibilityLabel="Create new note"
        accessibilityHint="Creates a new encrypted note">
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  listHeader: {
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noteItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  noteTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  noteTime: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
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
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 32,
  },
});
