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
