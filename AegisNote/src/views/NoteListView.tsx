/**
 * AegisNote - Note List View
 * Displays a list of encrypted notes with quick access to note metadata.
 * Implements 60fps scrolling with FlatList optimization.
 */

import React, { useCallback } from 'react';
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
  const { notes, isLoading, loadNotes } = useNoteStore();

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
          activeOpacity={0.8}>
          <View style={styles.noteHeader}>
            <View style={styles.noteTitleContainer}>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {item.title || 'Untitled Note'}
              </Text>
              {item.encryptedContent.length > 50 && (
                <Text style={styles.notePreview} numberOfLines={1}>
                  {item.encryptedContent}
                </Text>
              )}
            </View>
            <View style={styles.noteMeta}>
              <Text style={styles.noteTime}>{formattedTime}</Text>
              <Text style={styles.noteDate}>{formattedDate}</Text>
            </View>
          </View>
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
          <Text style={styles.emptyIconText}>📝</Text>
        </View>
        <Text style={styles.emptyTitle}>No encrypted notes yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first secure note to get started
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={onNoteCreate}
          activeOpacity={0.8}>
          <Text style={styles.createButtonText}>Create Note</Text>
        </TouchableOpacity>
      </View>
    );
  }, [onNoteCreate]);

  // Calculate total notes count
  const noteCount = notes.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AegisNote</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{noteCount}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{notes.reduce((acc, n) => acc + n.encryptedContent.length, 0)} chars</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
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
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E0E0E0',
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
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  noteTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  noteMeta: {
    alignItems: 'flex-end',
  },
  noteTime: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  noteDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
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
    backgroundColor: '#E8F4FD',
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
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
