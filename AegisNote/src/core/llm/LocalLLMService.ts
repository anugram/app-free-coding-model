/**
 * AegisNote - Local Large Language Model (LLM) Service
 *
 * Implements on-device generative AI using GGUF format models.
 * This service runs entirely on-device with no cloud communication.
 *
 * Features:
 * - GGUF model loading and inference
 * - Memory-efficient model management
 * - Streaming token generation
 * - Hardware acceleration (Metal/Vulkan)
 */

import {Platform} from 'react-native';

import {LLMConfig, LLMStatus, GeneratedToken, GenerationOptions} from './types';
import {MODEL_DIR, SLM_MODEL_NAME} from '../../common/constants';

// Native module bridge (to be implemented with native bindings)
// For now, this provides the TypeScript interface and mock implementation
interface NativeLLMModule {
  initialize(modelPath: string, config: Record<string, unknown>): Promise<boolean>;
  generate(prompt: string, options: GenerationOptions): Promise<string>;
  generateStreaming(
    prompt: string,
    options: GenerationOptions,
    onToken?: (token: string) => void,
  ): Promise<void>;
  unload(): Promise<void>;
  getStatus(): string;
  getMemoryUsage(): number;
}

// Mock native module for development - replace with actual bindings in production
const NativeLLMModule: NativeLLMModule = {
  initialize: async () => true,
  generate: async () => '',
  generateStreaming: async () => {},
  unload: async () => {},
  getStatus: () => 'idle',
  getMemoryUsage: () => 0,
};

/**
 * LLM Service status enum
 */
export enum ServiceStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  GENERATING = 'generating',
  ERROR = 'error',
}

/**
 * Local LLM Service class
 *
 * Manages the lifecycle of the on-device generative model.
 * Handles model loading, text generation, and memory management.
 */
export class LocalLLMService {
  private static instance: LocalLLMService;

  private config: LLMConfig;
  private status: ServiceStatus = ServiceStatus.IDLE;
  private modelLoaded: boolean = false;
  private modelPath: string | null = null;

  // Memory tracker
  private memoryUsage: number = 0;

  /**
   * Private constructor for singleton pattern.
   * Use `getInstance()` to access the service.
   */
  private constructor(config: LLMConfig = LocalLLMService.getDefaultConfig()) {
    this.config = config;
  }

  /**
   * Get default configuration
   */
  public static getDefaultConfig(): LLMConfig {
    return {
      nCtx: 4096, // Context window size
      nBatch: 512, // Batch size for processing
      nThreads: Platform.OS === 'ios' ? 4 : 2, // CPU threads
      nThreadsBatch: Platform.OS === 'ios' ? 4 : 2,
      useMlock: true, // Lock memory to prevent swapping
      useMmap: true, // Memory-map model file
      useKcache: true, // Use key cache
      useVcache: true, // Use value cache
      streaming: true,
    };
  }

  /**
   * Get or create the singleton instance.
   */
  public static getInstance(config?: LLMConfig): LocalLLMService {
    if (!LocalLLMService.instance) {
      LocalLLMService.instance = new LocalLLMService(config || LocalLLMService.getDefaultConfig());
    }
    return LocalLLMService.instance;
  }

  /**
   * Get current service status
   */
  public getStatus(): ServiceStatus {
    return this.status;
  }

  /**
   * Check if model is loaded and ready
   */
  public isModelLoaded(): boolean {
    return this.modelLoaded && this.status === ServiceStatus.READY;
  }

  /**
   * Get memory usage in bytes
   */
  public getMemoryUsage(): number {
    return this.memoryUsage;
  }

  // ================== Model Lifecycle Management ====================

  /**
   * Initialize the LLM service and load the model.
   *
   * @param modelPath - Path to the GGUF model file
   * @returns - Promise that resolves when model is ready
   */
  public async initialize(modelPath?: string): Promise<void> {
    if (this.modelLoaded) {
      return;
    }

    this.status = ServiceStatus.LOADING;

    try {
      // Determine model path
      const path = modelPath || this.getModelPath();
      this.modelPath = path;

      console.log(`[LocalLLMService] Initializing with model: ${path}`);

      // Initialize native module
      const success = await NativeLLMModule.initialize(path, {...this.config} as Record<string, unknown>);

      if (!success) {
        throw new Error('Failed to initialize LLM model');
      }

      this.modelLoaded = true;
      this.status = ServiceStatus.READY;

      // Track memory usage
      this.memoryUsage = await NativeLLMModule.getMemoryUsage();
      console.log(`[LocalLLMService] Model loaded successfully. Memory: ${this.memoryUsage} bytes`);

    } catch (error) {
      console.error('[LocalLLMService] Failed to initialize:', error);
      this.status = ServiceStatus.ERROR;
      this.modelLoaded = false;
      throw error;
    }
  }

  /**
   * Get the expected model path
   */
  private getModelPath(): string {
    // In production, this would use react-native-fs or similar
    // to get the actual filesystem path
    const modelFileName = SLM_MODEL_NAME;
    return `${MODEL_DIR}/${modelFileName}`;
  }

  /**
   * Generate text from a prompt.
   *
   * @param prompt - The input prompt
   * @param options - Generation options (temperature, max tokens, etc.)
   * @returns - Generated text response
   */
  public async generate(
    prompt: string,
    options?: GenerationOptions,
  ): Promise<string> {
    if (!this.modelLoaded) {
      await this.initialize();
    }

    this.status = ServiceStatus.GENERATING;

    try {
      const result = await NativeLLMModule.generate(prompt, {
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? this.config.maxTokens ?? 512,
        topP: options?.topP ?? this.config.topP ?? 0.9,
        stop: options?.stop ?? this.config.stop ?? ['</s>', 'User:', 'Assistant:'],
      });

      return result;
    } catch (error) {
      console.error('[LocalLLMService] Generation error:', error);
      this.status = ServiceStatus.ERROR;
      throw error;
    } finally {
      this.status = ServiceStatus.READY;
    }
  }

  /**
   * Generate text with streaming tokens.
   *
   * @param prompt - The input prompt
   * @param options - Generation options
   * @param onToken - Callback for each generated token
   * @returns - Promise that resolves when generation completes
   */
  public async generateStreaming(
    prompt: string,
    options?: GenerationOptions,
    onToken?: (token: string) => void,
  ): Promise<void> {
    if (!this.modelLoaded) {
      await this.initialize();
    }

    this.status = ServiceStatus.GENERATING;

    try {
      await NativeLLMModule.generateStreaming(
        prompt,
        {
          temperature: options?.temperature ?? this.config.temperature ?? 0.7,
          maxTokens: options?.maxTokens ?? this.config.maxTokens ?? 512,
          topP: options?.topP ?? this.config.topP ?? 0.9,
          stop: options?.stop ?? this.config.stop ?? ['</s>', 'User:', 'Assistant:'],
        },
        onToken,
      );
    } catch (error) {
      console.error('[LocalLLMService] Streaming generation error:', error);
      this.status = ServiceStatus.ERROR;
      throw error;
    } finally {
      this.status = ServiceStatus.READY;
    }
  }

  /**
   * Unload the model from memory.
   * Should be called when switching to SDD or when app goes to background.
   */
  public async unload(): Promise<void> {
    if (!this.modelLoaded) {
      return;
    }

    this.status = ServiceStatus.IDLE;
    this.modelLoaded = false;

    try {
      await NativeLLMModule.unload();
      this.memoryUsage = 0;
      console.log('[LocalLLMService] Model unloaded');
    } catch (error) {
      console.error('[LocalLLMService] Error unloading model:', error);
      throw error;
    }
  }

  /**
   * Configure the service.
   */
  public configure(config: Partial<LLMConfig>): void {
    this.config = {...this.config, ...config};
  }

  /**
   * Get current configuration.
   */
  public getConfig(): LLMConfig {
    return {...this.config};
  }

  // ================== Utility Methods ====================

  /**
   * Format prompt for instruction-following models.
   */
  public formatPrompt(
    systemPrompt: string,
    userPrompt: string,
  ): string {
    return `${systemPrompt}\n\nUser: ${userPrompt}\nAssistant:`;
  }

  /**
   * Create a summary prompt from text.
   */
  public createSummaryPrompt(text: string, maxTokens: number = 256): string {
    return `Summarize the following text in a concise manner, highlighting key points and actions:

"${text}"

Summary:`;
  }

  /**
   * Create an action items prompt from text.
   */
  public createActionItemsPrompt(text: string): string {
    return `Extract action items from the following text as a bullet list:

"${text}"

Action Items:`;
  }
}

// Export singleton instance
export const localLLMService = LocalLLMService.getInstance();
