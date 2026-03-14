/**
 * AegisNote - Sensitive Data Scanner
 *
 * High-level scanner module that provides on-device sensitive data discovery.
 * This module wraps the SDDService with lifecycle management for the ML model
 * and provides memory-efficient scanning.
 *
 * Features:
 * - Auto-loading/unloading of ML model based on usage
 * - Memory warning handling
 * - Parallel Regex fallback layer
 * - Entity merging and deduplication
 */

import {SensitiveEntity, SensitiveEntityType} from '../../types';
import {SDDService, DEFAULT_SDD_CONFIG} from './SDDService';

/**
 * Scanner status enum
 */
export enum ScannerStatus {
  IDLE = 'idle',
  SCANNING = 'scanning',
  LOADING = 'loading',
  UNLOADING = 'unloading',
  ERROR = 'error',
}

/**
 * Scan options for customizing the scanning behavior
 */
export interface ScanOptions {
  /**
   * Enable ML model inference
   */
  useMLModel?: boolean;

  /**
   * Enable Regex fallback layer
   */
  useRegexFallback?: boolean;

  /**
   * Minimum confidence threshold for detected entities
   */
  confidenceThreshold?: number;

  /**
   * Entity types to specifically include
   */
  includeTypes?: SensitiveEntityType[];

  /**
   * Entity types to specifically exclude
   */
  excludeTypes?: SensitiveEntityType[];
}

/**
 * Default scan options
 */
export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  useMLModel: true,
  useRegexFallback: true,
  confidenceThreshold: 0.5,
};

/**
 * Sensitive Data Scanner class
 *
 * Provides a high-level interface for scanning text for sensitive data.
 * Manages the ML model lifecycle and handles memory warnings.
 */
export class SensitiveDataScanner {
  private static instance: SensitiveDataScanner;
  private sddService: SDDService;
  private status: ScannerStatus = ScannerStatus.IDLE;
  private scanOptions: ScanOptions;

  /**
   * Private constructor for singleton pattern.
   * Use `getInstance()` to access the scanner.
   */
  private constructor(options: ScanOptions = DEFAULT_SCAN_OPTIONS) {
    this.scanOptions = options;
    this.sddService = SDDService.getInstance({
      useMLModel: options.useMLModel ?? true,
      confidenceThreshold: options.confidenceThreshold ?? 0.7,
      useRegexFallback: options.useRegexFallback ?? true,
    });
  }

  /**
   * Get or create the singleton instance.
   */
  public static getInstance(options?: ScanOptions): SensitiveDataScanner {
    if (!SensitiveDataScanner.instance) {
      SensitiveDataScanner.instance = new SensitiveDataScanner(options || DEFAULT_SCAN_OPTIONS);
    }
    return SensitiveDataScanner.instance;
  }

  /**
   * Get current scanner status
   */
  public getStatus(): ScannerStatus {
    return this.status;
  }

  /**
   * Check if the ML model is loaded
   */
  public isModelLoaded(): boolean {
    return this.sddService.isModelLoaded() && this.sddService.isModelReady();
  }

  // ==================== Scanning Methods ====================

  /**
   * Scan a text string for sensitive entities.
   *
   * @param text - The text to scan
   * @param options - Optional scan configuration
   * @returns - Array of detected sensitive entities
   */
  public async scanText(text: string, options?: ScanOptions): Promise<SensitiveEntity[]> {
    if (typeof text !== 'string' || text.length === 0) {
      return [];
    }

    this.status = ScannerStatus.SCANNING;

    try {
      // If ML is enabled but model not loaded, load it
      if ((options?.useMLModel ?? this.scanOptions.useMLModel) && !this.sddService.isModelReady()) {
        this.status = ScannerStatus.LOADING;
        await this.loadModel();
      }

      // Create a temporary service with the options if provided
      const service = options ? this.createServiceWithOptions(options) : this.sddService;

      const entities = await service.scanText(text);

      // Filter by include/exclude types if specified
      return this.filterEntities(entities, options);
    } catch (error) {
      console.error('Error scanning text:', error);
      this.status = ScannerStatus.ERROR;
      return [];
    } finally {
      this.status = ScannerStatus.IDLE;
    }
  }

  /**
   * Scan multiple text strings for sensitive entities.
   *
   * @param texts - Array of text strings to scan
   * @param options - Optional scan configuration
   * @returns - Array of detected sensitive entities
   */
  public async scanTexts(texts: string[], options?: ScanOptions): Promise<SensitiveEntity[]> {
    const allEntities: SensitiveEntity[] = [];

    for (const text of texts) {
      const entities = await this.scanText(text, options);
      allEntities.push(...entities);
    }

    return allEntities;
  }

  /**
   * Scan note content for sensitive entities.
   *
   * @param noteId - The note ID
   * @param title - The note title
   * @param content - The note content
   * @param options - Optional scan configuration
   * @returns - Array of detected sensitive entities
   */
  public async scanNote(
    noteId: string,
    title: string,
    content: string,
    options?: ScanOptions,
  ): Promise<SensitiveEntity[]> {
    const fullText = `${title}\n\n${content}`;
    return this.scanText(fullText, options);
  }

  // ==================== Model Lifecycle Management ====================

  /**
   * Load the ML model into memory.
   * Should be called before scanning if ML is enabled.
   */
  public async loadModel(): Promise<void> {
    if (this.sddService.isModelReady()) {
      return;
    }

    this.status = ScannerStatus.LOADING;

    try {
      await this.sddService.loadModel();
    } catch (error) {
      console.error('Failed to load ML model:', error);
      this.status = ScannerStatus.ERROR;
      throw error;
    }

    this.status = ScannerStatus.IDLE;
  }

  /**
   * Unload the ML model from memory.
   * Should be called when the app goes to background or memory warnings.
   */
  public async unloadModel(): Promise<void> {
    if (!this.sddService.isModelLoaded()) {
      return;
    }

    this.status = ScannerStatus.UNLOADING;

    try {
      await this.sddService.unloadModel();
    } catch (error) {
      console.error('Failed to unload ML model:', error);
      this.status = ScannerStatus.ERROR;
      throw error;
    }

    this.status = ScannerStatus.IDLE;
  }

  /**
   * Handle memory warning - unload model to free memory.
   * Call this when the app receives a memory warning notification.
   */
  public async handleMemoryWarning(): Promise<void> {
    console.log('[SensitiveDataScanner] Memory warning received, unloading model');
    await this.unloadModel();
  }

  /**
   * Handle app background event - unload model to save memory.
   */
  public async handleAppBackground(): Promise<void> {
    console.log('[SensitiveDataScanner] App going to background, unloading model');
    await this.unloadModel();
  }

  /**
   * Handle app foreground event - reload model if needed.
   */
  public async handleAppForeground(): Promise<void> {
    console.log('[SensitiveDataScanner] App foregrounded, model status:', this.sddService.isModelLoaded() ? 'loaded' : 'not loaded');
    // Model will be reloaded on next scan if needed
  }

  // ==================== Utility Methods ====================

  /**
   * Create a new SDDService instance with custom options.
   */
  private createServiceWithOptions(options: ScanOptions): SDDService {
    return SDDService.getInstance({
      useMLModel: options.useMLModel ?? this.scanOptions.useMLModel ?? true,
      confidenceThreshold: options.confidenceThreshold ?? this.scanOptions.confidenceThreshold ?? 0.7,
      useRegexFallback: options.useRegexFallback ?? this.scanOptions.useRegexFallback ?? true,
    });
  }

  /**
   * Filter entities by include/exclude types.
   */
  private filterEntities(
    entities: SensitiveEntity[],
    options?: ScanOptions,
  ): SensitiveEntity[] {
    if (!options?.includeTypes && !options?.excludeTypes) {
      return entities;
    }

    return entities.filter(entity => {
      if (options?.includeTypes && options.includeTypes.length > 0) {
        return options.includeTypes.includes(entity.type);
      }
      if (options?.excludeTypes && options.excludeTypes.length > 0) {
        return !options.excludeTypes.includes(entity.type);
      }
      return true;
    });
  }

  /**
   * Get the current configuration.
   */
  public getConfig(): ScanOptions {
    return {...this.scanOptions};
  }

  /**
   * Update the configuration.
   */
  public updateConfig(options: ScanOptions): void {
    this.scanOptions = {...this.scanOptions, ...options};
  }
}

// Export singleton instance
export const sensitiveDataScanner = SensitiveDataScanner.getInstance();
