# Role: Frontend Mobile Engineer
# Epic 2: Secure Vault UI & State Management for "AegisNote"

## Objective
Build the user interface for the core note-taking experience, connecting it strictly to the secure data foundation established in Epic 1. Ensure high performance and smooth 60fps scrolling.

## Tech Stack
* **Framework:** React Native or Flutter (continuing from Epic 1)
* **State Management:** Zustand/Redux (React Native) or Riverpod/Provider (Flutter)

## Epic Requirements
1. **Note List View:** A main dashboard displaying a list of saved notes (decrypted on the fly into memory, never written to disk unencrypted).
2. **Note Editor:** A rich text or robust plain-text editor for creating and modifying notes.
3. **State Management:** Implement a reactive state store that handles the asynchronous loading of decrypted notes from the SQLCipher database.
4. **Memory Security:** Ensure that when the app goes into the background or is closed, the decrypted notes are immediately flushed from the UI state/memory.

## Your First Task
Implement the state management layer (`NoteStore` or `NoteProvider`). Write the logic that fetches notes from the `SecureStorageRepository` (from Epic 1), holds them in memory for the UI to consume, and includes a `flushMemory()` function that clears the state when the OS broadcasts a background event.
