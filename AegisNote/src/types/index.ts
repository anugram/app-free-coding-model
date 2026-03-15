// AegisNote - Core type definitions

export type Note = {
  id: string;
  title: string;
  encryptedContent: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
};

export type SensitiveEntityType =
  | 'PII_NAME'
  | 'PII_PHONE'
  | 'PII_EMAIL'
  | 'FINANCIAL_CC'
  | 'FINANCIAL_BANK'
  | 'API_KEY'
  | 'PASSWORD';

export type SensitiveEntity = {
  type: SensitiveEntityType;
  startIndex: number;
  endIndex: number;
  text: string;
  confidence: number;
};

export type RedactionMapping = {
  [key: string]: {
    original: string;
    type: SensitiveEntityType;
  };
};

export type RedactionResult = {
  redactedText: string;
  mapping: RedactionMapping;
};

export type NoteEvent =
  | { type: 'NOTE_CREATED'; payload: Note }
  | { type: 'NOTE_UPDATED'; payload: Note }
  | { type: 'NOTE_DELETED'; payload: { id: string } }
  | { type: 'MEMORY_FLUSHED' };

// ==================== LLM/Generative Types ===============

/** LLM Task type for the generative assistant */
export type LLMTaskType =
  | 'SUMMARIZE'
  | 'ACTION_ITEMS'
  | 'RESPONSE'
  | 'CLASSIFY'
  | 'REWRITE';

/** LLM task configuration */
export type LLMTaskConfig = {
  taskType: LLMTaskType;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
};

/** Generated response from LLM */
export type LLMResponse = {
  id: string;
  text: string;
  taskType: LLMTaskType;
  promptTokens: number;
  completionTokens: number;
  timestamp: number;
};

/** Generative assistant state */
export type GenerativeState = {
  isGenerating: boolean;
  currentTask: LLMTaskType | null;
  response: string | null;
  error: string | null;
};
