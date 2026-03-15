// Core module exports
export {secureKeyManager, SecureKeyManager} from '../core/SecureKeyManager';
export {SecureStorageRepository} from '../core/database/SecureStorageRepository';

// LLM module exports
export {localLLMService, LocalLLMService} from '../core/llm';
export {memoryOrchestrator, MemoryOrchestrator} from '../core/llm/MemoryOrchestrator';
export {modelDownloadManager, ModelDownloadManager} from '../core/llm/download';

// State management exports
export {useNoteStore} from '../store/NoteStore';
export {NoteProvider, useNoteContext} from '../context/NoteProvider';
