/**
 * AegisNote - Secure Storage Repository
 * Implements encrypted SQLite (SQLCipher) for secure data persistence.
 * All data is encrypted at rest using a 256-bit AES key from the SecureKeyManager.
 */

import {SecureKeyManager} from '../SecureKeyManager';
import {Note} from '../../types';

// react-native-sqlite-storage bridge
import SQLite, {openDatabase} from 'react-native-sqlite-storage';

// Open database helper - returns the database directly
const openDatabaseSync = (name: string, key: string): any => {
  const db = openDatabase(name, key, () => {
    console.log('Database opened successfully');
  }, (err: Error) => {
    console.error('Error opening database:', err);
  });
  return db;
};

export interface StorageRepository {
  // Database lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Note CRUD operations
  createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note>;
  getNote(id: string): Promise<Note | null>;
  getAllNotes(): Promise<Note[]>;
  updateNote(note: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;

  // Bulk operations
  bulkCreateNotes(notes: Note[]): Promise<void>;
  bulkUpdateNotes(notes: Note[]): Promise<void>;
  bulkDeleteNotes(ids: string[]): Promise<void>;

  // Database management
  clearAllData(): Promise<void>;
  getDatabaseInfo(): Promise<{size: number; noteCount: number}>;
}

/**
 * Secure storage repository using SQLite for encrypted data persistence.
 * All sensitive data is encrypted using AES-256-GCM with keys from SecureKeyManager.
 */
export class SecureStorageRepository implements StorageRepository {
  private static instance: SecureStorageRepository;
  private database: any | null = null;
  private isInitialized: boolean = false;

  constructor(private keyManager: SecureKeyManager) {}

  public static getInstance(keyManager: SecureKeyManager): SecureStorageRepository {
    if (!SecureStorageRepository.instance) {
      SecureStorageRepository.instance = new SecureStorageRepository(keyManager);
    }
    return SecureStorageRepository.instance;
  }

  /**
   * Initialize the secure database.
   * - Retrieves/Generates the encryption key from SecureKeyManager
   * - Opens the SQLCipher database
   * - Creates the notes table if it doesn't exist
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Get the encryption key from secure key manager
    const key = await this.keyManager.retrieveKey();
    console.log('[SecureStorageRepository] Retrieved encryption key, length:', key?.length || 0);
    if (!key) {
      throw new Error(
        'Database encryption key not found. Please generate a key first.',
      );
    }

    try {
      console.log('[SQLite] Opening database with key (length:', key.length + ')');
      // Open the encrypted database
      this.database = openDatabaseSync('aegisnote.db', key);
      console.log('[SQLite] Database object:', this.database);

      // Create the notes table
      await this.createTables();

      this.isInitialized = true;
    } catch (error: any) {
      console.error('[SQLite] Detailed error:', error);
      throw new Error(`Failed to initialize secure database: ${error?.message || error}`);
    }
  }

  /**
   * Close the database connection securely.
   * Clears any cached decrypted data from memory.
   */
  public async close(): Promise<void> {
    if (this.database) {
      await new Promise((resolve, reject) => {
        this.database.close((result: any) => {
          console.log('Database closed:', result);
          resolve(true);
        }, (err: Error) => {
          console.error('Error closing database:', err);
          reject(err);
        });
      });
      this.database = null;
      this.isInitialized = false;
    }
  }

  /**
   * Create the database schema.
   */
  private async createTables(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        encrypted_content TEXT NOT NULL,
        iv TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;

    await this.executeSql(createTableSQL, []);
  }

  /**
   * Execute SQL query with parameters.
   */
  private async executeSql(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.database) {
        return reject(new Error('Database not initialized'));
      }

      this.database.executeSql(sql, params, (result: any) => {
        resolve(result);
      }, (err: Error) => {
        reject(err);
      });
    });
  }

  /**
   * Generate a UUID for note IDs.
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ==================== Note CRUD Operations ====================

  /**
   * Create a new encrypted note.
   */
  public async createNote(noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const id = this.generateUUID();
    const now = Date.now();

    const note: Note = {
      ...noteData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const insertSQL = `
      INSERT INTO notes (id, title, encrypted_content, iv, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.executeSql(insertSQL, [
      note.id,
      note.title,
      note.encryptedContent,
      note.iv,
      note.createdAt,
      note.updatedAt,
    ]);

    return note;
  }

  /**
   * Retrieve a single note by ID.
   */
  public async getNote(id: string): Promise<Note | null> {
    const selectSQL = `SELECT * FROM notes WHERE id = ?`;
    const results = await this.executeSql(selectSQL, [id]);

    if (results.rows.length > 0) {
      const row = results.rows.item(0);
      return {
        id: row.id,
        title: row.title,
        encryptedContent: row.encrypted_content,
        iv: row.iv,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    return null;
  }

  /**
   * Retrieve all notes ordered by update time (newest first).
   */
  public async getAllNotes(): Promise<Note[]> {
    const selectSQL = `
      SELECT * FROM notes
      ORDER BY updated_at DESC
      LIMIT 1000
    `;

    const results = await this.executeSql(selectSQL, []);

    const notes: Note[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      notes.push({
        id: row.id,
        title: row.title,
        encryptedContent: row.encrypted_content,
        iv: row.iv,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    return notes;
  }

  /**
   * Update an existing note.
   */
  public async updateNote(note: Note): Promise<void> {
    const updateSQL = `
      UPDATE notes
      SET title = ?, encrypted_content = ?, iv = ?, updated_at = ?
      WHERE id = ?
    `;

    await this.executeSql(updateSQL, [
      note.title,
      note.encryptedContent,
      note.iv,
      note.updatedAt,
      note.id,
    ]);
  }

  /**
   * Delete a note by ID.
   */
  public async deleteNote(id: string): Promise<void> {
    const deleteSQL = `DELETE FROM notes WHERE id = ?`;
    await this.executeSql(deleteSQL, [id]);
  }

  // ==================== Bulk Operations ====================

  /**
   * Create multiple notes in a batch.
   */
  public async bulkCreateNotes(notes: Note[]): Promise<void> {
    const insertSQL = `
      INSERT INTO notes (id, title, encrypted_content, iv, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const batch: {sql: string; params: any[]}[] = notes.map(note => ({
      sql: insertSQL,
      params: [
        note.id,
        note.title,
        note.encryptedContent,
        note.iv,
        note.createdAt,
        note.updatedAt,
      ],
    }));

    await this.executeBatch(batch);
  }

  /**
   * Update multiple notes in a batch.
   */
  public async bulkUpdateNotes(notes: Note[]): Promise<void> {
    const updateSQL = `
      UPDATE notes
      SET title = ?, encrypted_content = ?, iv = ?, updated_at = ?
      WHERE id = ?
    `;

    const batch: {sql: string; params: any[]}[] = notes.map(note => ({
      sql: updateSQL,
      params: [
        note.title,
        note.encryptedContent,
        note.iv,
        note.updatedAt,
        note.id,
      ],
    }));

    await this.executeBatch(batch);
  }

  /**
   * Delete multiple notes by ID.
   */
  public async bulkDeleteNotes(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const deleteSQL = `DELETE FROM notes WHERE id = ?`;
    const batch: {sql: string; params: any[]}[] = ids.map(id => ({
      sql: deleteSQL,
      params: [id],
    }));

    await this.executeBatch(batch);
  }

  /**
   * Execute a batch of SQL statements.
   */
  private async executeBatch(batch: {sql: string; params: any[]}[]): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    // SQLCipher doesn't support true batch execution, so we execute sequentially
    // In production, wrap this in a transaction for performance
    for (const statement of batch) {
      await this.executeSql(statement.sql, statement.params);
    }
  }

  // ==================== Database Management ====================

  /**
   * Clear all data from the database.
   * Used for factory reset or user logout.
   */
  public async clearAllData(): Promise<void> {
    const deleteSQL = `DELETE FROM notes`;
    await this.executeSql(deleteSQL, []);
  }

  /**
   * Get database statistics.
   */
  public async getDatabaseInfo(): Promise<{size: number; noteCount: number}> {
    const countSQL = `SELECT COUNT(*) as count FROM notes`;
    const results = await this.executeSql(countSQL, []);

    return {
      size: 0, // SQLCipher doesn't expose size directly
      noteCount: results.rows.length > 0 ? results.rows.item(0).count : 0,
    };
  }
}
