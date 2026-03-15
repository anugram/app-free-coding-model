/**
 * AegisNote - Local LLM Service Types
 *
 * TypeScript type definitions for the on-device generative AI service.
 */

/**
 * Generation options for text completion
 */
export interface GenerationOptions {
  /** Temperature for sampling (higher = more random) */
  temperature?: number;

  /** Maximum number of tokens to generate */
  maxTokens?: number;

  /** Top-P sampling threshold */
  topP?: number;

  /** Stop sequences that terminate generation */
  stop?: string[];

  /** Penalty for repeated tokens */
  frequencyPenalty?: number;

  /** Penalty for token presence */
  presencePenalty?: number;
}

/**
 * Configuration for the LLM service
 */
export interface LLMConfig {
  /** Context window size */
  nCtx: number;

  /** Batch size for processing */
  nBatch: number;

  /** Number of CPU threads for processing */
  nThreads: number;

  /** Number of threads for batch processing */
  nThreadsBatch: number;

  /** Lock memory to prevent swapping */
  useMlock: boolean;

  /** Memory-map model file for efficiency */
  useMmap: boolean;

  /** Use key cache */
  useKcache: boolean;

  /** Use value cache */
  useVcache: boolean;

  /** Enable streaming mode */
  streaming: boolean;

  /** Default temperature */
  temperature?: number;

  /** Default max tokens */
  maxTokens?: number;

  /** Default top-P */
  topP?: number;

  /** Default stop sequences */
  stop?: string[];
}

/**
 * Token generated during streaming
 */
export interface GeneratedToken {
  /** The token text */
  text: string;

  /** Token probability */
  probability?: number;

  /** Token index in vocabulary */
  id?: number;

  /** Timestamp in milliseconds */
  timestamp?: number;
}

/**
 * Generation result
 */
export interface GenerationResult {
  /** Generated text */
  text: string;

  /** Number of prompt tokens processed */
  promptTokens: number;

  /** Number of tokens generated */
  completionTokens: number;

  /** Total tokens processed */
  totalTokens: number;

  /** Generation time in milliseconds */
  durationMs: number;
}

/**
 * Model metadata
 */
export interface ModelMetadata {
  /** Model name */
  name: string;

  /** Model type (e.g., "Phi-3-mini-4k-instruct") */
  type: string;

  /** Quantization version (e.g., "q4_k_m") */
  quantization: string;

  /** Context window size */
  contextLength: number;

  /** Model parameters count */
  parameters: string;

  /** File size in bytes */
  fileSize: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Model memory usage in bytes */
  modelBytes: number;

  /** Context memory usage in bytes */
  contextBytes: number;

  /** Total memory usage in bytes */
  totalBytes: number;

  /** Peak memory usage in bytes */
  peakBytes: number;
}

/**
 * Status codes for LLM operations
 */
export enum LLMStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  GENERATING = 'generating',
  ERROR = 'error',
  UNLOADING = 'unloading',
}

/**
 * Error types for LLM service
 */
export enum LLMErrorType {
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  GENERATION_FAILED = 'GENERATION_FAILED',
  MEMORY_EXHAUSTED = 'MEMORY_EXHAUSTED',
  MODEL_FORMAT_ERROR = 'MODEL_FORMAT_ERROR',
}

/**
 * LLM-specific error class
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly type: LLMErrorType,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
