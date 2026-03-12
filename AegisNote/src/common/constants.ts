// AegisNote - Constants
export const DB_NAME = 'aegisnote.db';
export const NOTE_TABLE_NAME = 'notes';
export const KEY_ALIAS = 'aegisnote_db_key';

// AES-256 GCM
export const AES_KEY_SIZE = 32; // bytes
export const AES_IV_SIZE = 12; // bytes

// SDD Entity Patterns
export const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
export const PHONE_REGEX =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g;
export const CREDIT_CARD_REGEX =
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g;
export const API_KEY_REGEX = /\b(sk|pk|ak|rk)_[a-zA-Z0-9]{20,}\b/g;

// Model file paths
export const MODEL_DIR = 'models';
export const SDD_MODEL_NAME = 'sdd_model_quantized.tflite';
export const SLM_MODEL_NAME = 'gguf_model.gguf';

// Memory management
export const MEMORY_WARNING_THRESHOLD_IOS = 0.2; // 20% of total RAM
export const MEMORY_WARNING_THRESHOLD_ANDROID = 0.3; // 30%

// Redaction placeholders
export const PLACEHOLDER_PREFIX = '[';
export const PLACEHOLDER_SUFFIX = ']';
