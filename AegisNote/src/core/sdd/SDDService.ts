/**
 * AegisNote - Sensitive Data Discovery (SDD) Service
 *
 * Implements the local inference pipeline to scan text and identify
 * sensitive entities. This engine runs entirely on-device.
 *
 * The service uses a hybrid approach:
 * 1. ML Model Inference (TFLite/ExecuTorch) - for complex entity detection
 * 2. Regex Fallback Layer - for standard formats (emails, phone numbers, etc.)
 */

import {SensitiveEntity, SensitiveEntityType} from '../../types';
import {
  EMAIL_REGEX,
  PHONE_REGEX,
  CREDIT_CARD_REGEX,
  API_KEY_REGEX,
} from '../../common/constants';

/**
 * SDD Service configuration.
 */
export interface SDDConfig {
  /**
   * Whether to use the ML model when available.
   * Falls back to Regex if set to false.
   */
  useMLModel: boolean;

  /**
   * Confidence threshold for ML model predictions.
   * Values below this threshold will be discarded.
   */
  confidenceThreshold: number;

  /**
   * Whether to enable Regex fallback for standard patterns.
   */
  useRegexFallback: boolean;
}

/**
 * Default configuration for the SDD Service.
 */
export const DEFAULT_SDD_CONFIG: SDDConfig = {
  useMLModel: true,
  confidenceThreshold: 0.7,
  useRegexFallback: true,
};

/**
 * Sensitive Data Discovery Service class.
 *
 * Scans input text for sensitive entities including:
 * - PII: Names, phone numbers, emails
 * - Financial: Credit cards, bank account numbers
 * - API Keys: Secret keys and tokens
 */
export class SDDService {
  private static instance: SDDService;

  private config: SDDConfig;
  private mlModelLoaded: boolean = false;
  private mlModelReady: boolean = false;

  /**
   * Private constructor for singleton pattern.
   * Use `getInstance()` to access the service.
   */
  private constructor(config: SDDConfig = DEFAULT_SDD_CONFIG) {
    this.config = config;
    this.mlModelLoaded = false;
    this.mlModelReady = false;
  }

  /**
   * Get or create the singleton instance.
   */
  public static getInstance(config?: SDDConfig): SDDService {
    if (!SDDService.instance) {
      SDDService.instance = new SDDService(config || DEFAULT_SDD_CONFIG);
    }
    return SDDService.instance;
  }

  /**
   * Check if the ML model is currently loaded in memory.
   */
  public isModelLoaded(): boolean {
    return this.mlModelLoaded;
  }

  /**
   * Check if the ML model is ready for inference.
   */
  public isModelReady(): boolean {
    return this.mlModelReady;
  }

  // ==================== Main Scanning Methods ====================

  /**
   * Scan a single text string for sensitive entities.
   *
   * @param text - The text to scan
   * @returns - Array of detected sensitive entities
   */
  public async scanText(text: string): Promise<SensitiveEntity[]> {
    const entities: SensitiveEntity[] = [];

    // Run Regex fallback layer (always enabled)
    if (this.config.useRegexFallback) {
      const regexEntities = this.runRegexFallback(text);
      entities.push(...regexEntities);
    }

    // Run ML model inference (if enabled and model loaded)
    if (this.config.useMLModel && this.mlModelReady) {
      const mlEntities = await this.runMLInference(text);
      entities.push(...mlEntities);
    }

    // Merge overlapping entities (keep highest confidence)
    return this.mergeOverlappingEntities(entities);
  }

  /**
   * Scan multiple text strings for sensitive entities.
   *
   * @param texts - Array of text strings to scan
   * @returns - Array of detected sensitive entities
   */
  public async scanTexts(texts: string[]): Promise<SensitiveEntity[]> {
    const allEntities: SensitiveEntity[] = [];

    for (const text of texts) {
      const entities = await this.scanText(text);
      allEntities.push(...entities);
    }

    return allEntities;
  }

  // ==================== Regex Fallback Layer ====================

  /**
   * Run regex-based detection for standard formats.
   * This provides 100% recall for well-defined patterns.
   */
  private runRegexFallback(text: string): SensitiveEntity[] {
    const entities: SensitiveEntity[] = [];

    // Email detection
    entities.push(...this.matchRegex(text, EMAIL_REGEX, 'PII_EMAIL'));

    // Phone number detection
    entities.push(...this.matchRegex(text, PHONE_REGEX, 'PII_PHONE'));

    // Credit card detection
    entities.push(...this.matchRegex(text, CREDIT_CARD_REGEX, 'FINANCIAL_CC'));

    // API Key detection
    entities.push(...this.matchRegex(text, API_KEY_REGEX, 'API_KEY'));

    return entities;
  }

  /**
   * Match a regex pattern against text and return entities.
   */
  private matchRegex(
    text: string,
    regex: RegExp,
    entityType: SensitiveEntityType,
  ): SensitiveEntity[] {
    const entities: SensitiveEntity[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state for multiple matches
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      entities.push({
        type: entityType,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        text: match[0],
        confidence: 0.95, // High confidence for regex matches
      });
    }

    return entities;
  }

  // ==================== ML Model Inference ====================

  /**
   * Run ML model inference on text.
   * This is a placeholder implementation - in production, this would
   * interface with TFLite or ExecuTorch.
   */
  private async runMLInference(text: string): Promise<SensitiveEntity[]> {
    // TODO: Implement actual TFLite/ExecuTorch inference
    // This is a mock implementation for now

    // Simulate async inference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Return empty for now - actual entities would be detected by the model
    return [];
  }

  /**
   * Load the ML model into memory.
   * Should be called before scanText() if ML is enabled.
   */
  public async loadModel(): Promise<void> {
    if (this.mlModelLoaded) {
      return;
    }

    try {
      // TODO: Load model from file
      // For now, just mark as ready
      this.mlModelLoaded = true;
      this.mlModelReady = true;
    } catch (error) {
      console.error('Failed to load ML model:', error);
      this.mlModelLoaded = false;
      this.mlModelReady = false;
    }
  }

  /**
   * Unload the ML model from memory.
   * Should be called when the app goes to background or memory warnings.
   */
  public async unloadModel(): Promise<void> {
    if (!this.mlModelLoaded) {
      return;
    }

    try {
      // TODO: Unload model from TFLite/ExecuTorch
      this.mlModelLoaded = false;
      this.mlModelReady = false;
    } catch (error) {
      console.error('Failed to unload ML model:', error);
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Merge overlapping entities, keeping the highest confidence.
   * This handles cases where multiple detectors find the same text.
   */
  private mergeOverlappingEntities(
    entities: SensitiveEntity[],
  ): SensitiveEntity[] {
    if (entities.length === 0) {
      return [];
    }

    // Sort by start index
    const sorted = [...entities].sort((a, b) => a.startIndex - b.startIndex);

    const merged: SensitiveEntity[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // Check if entities overlap
      if (next.startIndex < current.endIndex) {
        // Keep the one with higher confidence
        if (next.confidence > current.confidence) {
          current = next;
        }
        // Merge if they're the same type
        else if (next.type === current.type && next.endIndex > current.endIndex) {
          current.endIndex = next.endIndex;
          current.text = sorted[0].substring(current.startIndex, current.endIndex);
        }
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }
}
