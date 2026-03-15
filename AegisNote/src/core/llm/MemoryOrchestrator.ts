/**
 * AegisNote - Memory Orchestrator
 *
 * Manages memory allocation between the Sensitive Data Discovery (SDD)
 * classifier and the generative Small Language Model (SLM).
 *
 * Running both models simultaneously would crash most mobile devices.
 * This orchestrator ensures proper model swapping with memory cleanup.
 */

import {Platform} from 'react-native';
import {SDDService} from '../sdd/SDDService';
import {LocalLLMService} from './LocalLLMService';

/**
 * Memory pressure levels
 */
export enum MemoryPressure {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Memory orchestrator events
 */
export interface MemoryEvents {
  onSDDLoaded: () => void;
  onSLMLoaded: () => void;
  onSDDUnloaded: () => void;
  onSLMUnloaded: () => void;
  onMemoryPressure: (pressure: MemoryPressure) => void;
}

/**
 * Memory Orchestrator class
 *
 * Coordinates model loading/unloading to prevent memory exhaustion.
 * Provides methods to:
 * - Switch between SDD and SLM models safely
 * - Handle memory warnings
 * - Track memory usage
 */
export class MemoryOrchestrator {
  private static instance: MemoryOrchestrator;

  // Model instances
  private sddService: SDDService;
  private llmService: LocalLLMService;

  // Current state
  private activeModel: 'sdd' | 'slm' | 'none' = 'none';
  private memoryPressure: MemoryPressure = MemoryPressure.LOW;

  // Configuration
  private readonly sddMemoryThreshold: number;
  private readonly slmMemoryThreshold: number;

  /**
   * Private constructor for singleton pattern.
   * Use `getInstance()` to access the orchestrator.
   */
  private constructor() {
    this.sddService = SDDService.getInstance();
    this.llmService = LocalLLMService.getInstance();

    // Memory thresholds in bytes (estimated)
    // SDD model: ~100-200MB quantized
    // SLM model: ~1.5-2GB quantized
    this.sddMemoryThreshold = 250 * 1024 * 1024; // 250MB
    this.slmMemoryThreshold = 2.5 * 1024 * 1024 * 1024; // 2.5GB
  }

  /**
   * Get or create the singleton instance.
   */
  public static getInstance(): MemoryOrchestrator {
    if (!MemoryOrchestrator.instance) {
      MemoryOrchestrator.instance = new MemoryOrchestrator();
    }
    return MemoryOrchestrator.instance;
  }

  /**
   * Get current active model
   */
  public getActiveModel(): 'sdd' | 'slm' | 'none' {
    return this.activeModel;
  }

  /**
   * Get current memory pressure level
   */
  public getMemoryPressure(): MemoryPressure {
    return this.memoryPressure;
  }

  // ==================== Model Switching Methods ====================

  /**
   * Switch from current model to SDD.
   * Unloads SLM if active, then loads SDD.
   */
  public async switchToSDD(): Promise<void> {
    console.log('[MemoryOrchestrator] Switching to SDD model');

    try {
      // Unload SLM if active
      if (this.activeModel === 'slm') {
        console.log('[MemoryOrchestrator] Unloading SLM');
        await this.llmService.unload();
      }

      // Load SDD
      if (!this.sddService.isModelReady()) {
        console.log('[MemoryOrchestrator] Loading SDD model');
        await this.sddService.loadModel();
      }

      this.activeModel = 'sdd';
      this.checkMemoryPressure();

      console.log('[MemoryOrchestrator] Successfully switched to SDD');
    } catch (error) {
      console.error('[MemoryOrchestrator] Failed to switch to SDD:', error);
      this.activeModel = 'none';
      throw error;
    }
  }

  /**
   * Switch from current model to SLM.
   * Unloads SDD if active, then loads SLM.
   *
   * @param modelPath - Optional path to GGUF model file
   */
  public async switchToSLM(modelPath?: string): Promise<void> {
    console.log('[MemoryOrchestrator] Switching to SLM model');

    try {
      // Check if we have enough memory
      if (!this.canLoadSLM()) {
        throw new Error('Insufficient memory to load SLM model');
      }

      // Unload SDD if active
      if (this.activeModel === 'sdd') {
        console.log('[MemoryOrchestrator] Unloading SDD model');
        await this.sddService.unloadModel();
      }

      // Load SLM
      if (!this.llmService.isModelLoaded()) {
        console.log('[MemoryOrchestrator] Loading SLM model');
        await this.llmService.initialize(modelPath);
      }

      this.activeModel = 'slm';
      this.checkMemoryPressure();

      console.log('[MemoryOrchestrator] Successfully switched to SLM');
    } catch (error) {
      console.error('[MemoryOrchestrator] Failed to switch to SLM:', error);
      this.activeModel = 'none';
      throw error;
    }
  }

  /**
   * Perform a model swap: unload current, load new.
   * This is the safe way to switch between models.
   */
  public async swapModel(target: 'sdd' | 'slm'): Promise<void> {
    console.log(`[MemoryOrchestrator] Swapping to ${target}`);

    try {
      // Always unload current model first
      if (this.activeModel === 'sdd') {
        await this.sddService.unloadModel();
      } else if (this.activeModel === 'slm') {
        await this.llmService.unload();
      }

      // Load target model
      if (target === 'sdd') {
        await this.sddService.loadModel();
        this.activeModel = 'sdd';
      } else {
        if (!this.canLoadSLM()) {
          throw new Error('Insufficient memory to load SLM');
        }
        await this.llmService.initialize();
        this.activeModel = 'slm';
      }

      this.checkMemoryPressure();
      console.log(`[MemoryOrchestrator] Successfully swapped to ${target}`);
    } catch (error) {
      console.error('[MemoryOrchestrator] Model swap failed:', error);
      this.activeModel = 'none';
      throw error;
    }
  }

  // ==================== Memory Management Methods ====================

  /**
   * Check if SLM can be loaded based on available memory.
   * Returns true if estimated memory usage is below threshold.
   */
  public canLoadSLM(): boolean {
    // Estimate SLM memory: model size + context window
    const estimatedSLMMemory = this.slmMemoryThreshold;

    // Get available memory (simplified - would need native module for accurate reading)
    const availableMemory = this.getAvailableMemory();

    console.log(
      `[MemoryOrchestrator] Available: ${availableMemory / 1024 / 1024}MB, Required: ${estimatedSLMMemory / 1024 / 1024}MB`,
    );

    return availableMemory > estimatedSLMMemory * 1.2; // 20% safety margin
  }

  /**
   * Get estimated available memory in bytes.
   * This is a simplified implementation - in production, use:
   * - iOS: NSProcessInfo.processInfo.physicalMemory
   * - Android: ActivityManager.getMemoryInfo()
   */
  private getAvailableMemory(): number {
    // Platform-specific memory estimation
    if (Platform.OS === 'ios') {
      // iOS: Assume 2GB baseline for modern devices
      // In production, use react-native-device-info or native module
      return 2 * 1024 * 1024 * 1024; // 2GB
    } else {
      // Android: Assume 4GB baseline for modern devices
      return 4 * 1024 * 1024 * 1024; // 4GB
    }
  }

  /**
   * Check memory pressure and update status.
   */
  public checkMemoryPressure(): void {
    const totalMemory = this.getAvailableMemory();
    const usedMemory =
      this.activeModel === 'sdd'
        ? this.sddMemoryThreshold
        : this.activeModel === 'slm'
          ? this.slmMemoryThreshold
          : 0;

    const memoryUsageRatio = usedMemory / totalMemory;

    if (memoryUsageRatio > 0.85) {
      this.memoryPressure = MemoryPressure.CRITICAL;
    } else if (memoryUsageRatio > 0.7) {
      this.memoryPressure = MemoryPressure.HIGH;
    } else if (memoryUsageRatio > 0.5) {
      this.memoryPressure = MemoryPressure.MODERATE;
    } else {
      this.memoryPressure = MemoryPressure.LOW;
    }

    console.log(`[MemoryOrchestrator] Memory pressure: ${this.memoryPressure}`);
  }

  /**
   * Handle memory warning from OS.
   * Unloads the heavier SLM model first.
   */
  public async handleMemoryWarning(): Promise<void> {
    console.log('[MemoryOrchestrator] Memory warning received');

    try {
      // Prefer keeping SDD (lighter), unload SLM
      if (this.activeModel === 'slm') {
        console.log('[MemoryOrchestrator] Unloading SLM due to memory pressure');
        await this.llmService.unload();
        this.activeModel = 'none';
        this.checkMemoryPressure();
      }
    } catch (error) {
      console.error('[MemoryOrchestrator] Error handling memory warning:', error);
    }
  }

  /**
   * Handle app going to background.
   * Unloads both models to free memory.
   */
  public async handleAppBackground(): Promise<void> {
    console.log('[MemoryOrchestrator] App going to background');

    try {
      if (this.activeModel === 'slm') {
        await this.llmService.unload();
      }
      if (this.activeModel === 'sdd') {
        await this.sddService.unloadModel();
      }
      this.activeModel = 'none';
      this.memoryPressure = MemoryPressure.LOW;
    } catch (error) {
      console.error('[MemoryOrchestrator] Error handling background:', error);
    }
  }

  /**
   * Handle app foregrounding.
   * Model will be reloaded on next use.
   */
  public handleAppForeground(): void {
    console.log('[MemoryOrchestrator] App foregrounded');
    this.checkMemoryPressure();
  }

  // ==================== SDD Proxy Methods ====================

  /**
   * Proxy to SDD scanText (forwards to SDDService if loaded).
   */
  public async scanText(text: string): Promise<any[]> {
    if (this.activeModel !== 'sdd') {
      await this.switchToSDD();
    }
    return this.sddService.scanText(text);
  }

  // ==================== SLM Proxy Methods ====================

  /**
   * Proxy to LLM generate (forwards to LocalLLMService if loaded).
   */
  public async generate(
    prompt: string,
  ): Promise<string> {
    if (this.activeModel !== 'slm') {
      await this.switchToSLM();
    }
    return this.llmService.generate(prompt);
  }

  /**
   * Proxy to LLM generateStreaming (forwards to LocalLLMService if loaded).
   */
  public async generateStreaming(
    prompt: string,
    onToken: (token: string) => void,
  ): Promise<void> {
    if (this.activeModel !== 'slm') {
      await this.switchToSLM();
    }
    return this.llmService.generateStreaming(prompt, undefined, onToken);
  }
}

// Export singleton instance
export const memoryOrchestrator = MemoryOrchestrator.getInstance();
