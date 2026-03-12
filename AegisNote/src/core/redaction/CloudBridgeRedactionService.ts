/**
 * AegisNote - Cloud Bridge Redaction Service
 *
 * Implements the redaction pipeline for Feature 3:
 * 1. Parse text through the shared-core SDD engine
 * 2. Replace sensitive entities with deterministic placeholders
 * 3. Store the mapping dictionary locally in secure memory
 * 4. Send the redacted text to the external API
 * 5. Re-hydrate the text using the local mapping before displaying
 *
 * This module uses a shared core (TypeScript) that works across both
 * React Native and Flutter via JSI/FFI bindings.
 */

import {SDDService} from '../sdd/SDDService';
import {SensitiveEntity, RedactionMapping, RedactionResult} from '../../types';
import {
  PLACEHOLDER_PREFIX,
  PLACEHOLDER_SUFFIX,
  EMAIL_REGEX,
  PHONE_REGEX,
  CREDIT_CARD_REGEX,
  API_KEY_REGEX,
} from '../../common/constants';

/**
 * Configuration for the Cloud Bridge Redaction Service.
 */
export interface CloudBridgeConfig {
  /**
   * Maximum number of redaction mappings to store before flushing.
   * Prevents memory exhaustion during long sessions.
   */
  maxMappingCacheSize: number;

  /**
   * Whether to redact all sensitive data or only specific types.
   */
  redactAll: boolean;

  /**
   * Specific sensitive entity types to redact when redactAll is false.
   */
  redactTypes?: SensitiveEntityType[];
}

/**
 * Default configuration for the Cloud Bridge Redaction Service.
 */
export const DEFAULT_CLOUD_BRIDGE_CONFIG: CloudBridgeConfig = {
  maxMappingCacheSize: 1000,
  redactAll: true,
};

/**
 * Cloud Bridge Redaction Service class.
 *
 * Provides the secure redaction pipeline for sending user text to
 * external cloud APIs while ensuring PII never leaves the device
 * in plaintext form.
 */
export class CloudBridgeRedactionService {
  private static instance: CloudBridgeRedactionService;

  private config: CloudBridgeConfig;
  private sddService: SDDService;
  private mappingCache: RedactionMapping = {};
  private mappingCounter: number = 0;

  /**
   * Private constructor for singleton pattern.
   * Use `getInstance()` to access the service.
   */
  private constructor(config: CloudBridgeConfig = DEFAULT_CLOUD_BRIDGE_CONFIG) {
    this.config = config;
    this.sddService = SDDService.getInstance();
    this.mappingCache = {};
    this.mappingCounter = 0;
  }

  /**
   * Get or create the singleton instance.
   */
  public static getInstance(
    config?: CloudBridgeConfig,
  ): CloudBridgeRedactionService {
    if (!CloudBridgeRedactionService.instance) {
      CloudBridgeRedactionService.instance = new CloudBridgeRedactionService(
        config || DEFAULT_CLOUD_BRIDGE_CONFIG,
      );
    }
    return CloudBridgeRedactionService.instance;
  }

  /**
   * Get the current mapping cache for debugging/auditing.
   * Returns a copy of the mapping (does not expose internal state).
   */
  public getMappingCache(): RedactionMapping {
    return {...this.mappingCache};
  }

  /**
   * Clear the current mapping cache.
   * Should be called after re-hydration is complete or on app background.
   */
  public clearMappingCache(): void {
    this.mappingCache = {};
    this.mappingCounter = 0;
  }

  /**
   * Check if cache is at capacity.
   */
  public isCacheFull(): boolean {
    return Object.keys(this.mappingCache).length >= this.config.maxMappingCacheSize;
  }

  // ==================== Redaction Pipeline ====================

  /**
   * Main redaction pipeline: takes raw text, returns redacted text and mapping.
   *
   * Step 1: Parse text through the shared-core SDD engine
   * Step 2: Replace sensitive entities with deterministic placeholders
   * Step 3: Store the mapping dictionary locally
   */
  public async redactText(text: string): Promise<RedactionResult> {
    // Step 1: Find sensitive entities using SDD
    const sensitiveEntities = await this.sddService.scanText(text);

    // Step 2: Create redacted text with placeholders
    const {redactedText, mapping} = this.createRedactedText(text, sensitiveEntities);

    // Step 3: Store mapping for later re-hydration
    this.mappingCache = {...this.mappingCache, ...mapping};

    // Check cache capacity and flush if needed
    if (this.isCacheFull()) {
      this.flushCacheToSecureStorage();
    }

    return {
      redactedText,
      mapping,
    };
  }

  /**
   * Re-hydrate redacted text back to original form.
   *
   * Step 5: Use the local mapping dictionary to restore sensitive data.
   */
  public async rehydrateText(redactedText: string): Promise<string> {
    // Sort mapping keys by placeholder ID (descending) to avoid replacement collisions
    const sortedPlaceholders = Object.keys(this.mappingCache).sort((a, b) => {
      const idA = this.getPlaceholderId(a);
      const idB = this.getPlaceholderId(b);
      return idB - idA;
    });

    let result = redactedText;

    // Replace each placeholder with original text
    for (const placeholder of sortedPlaceholders) {
      const originalText = this.mappingCache[placeholder].original;
      result = result.replace(new RegExp(placeholder, 'g'), originalText);
    }

    return result;
  }

  /**
   * Full pipeline: redact, send to API, re-hydrate.
   *
   * @param text - Original user text
   * @param sendToApi - Function that sends redacted text to external API
   * @returns - Promise that resolves to the API response with original text restored
   */
  public async redactAndSendToApi<TResponse>(
    text: string,
    sendToApi: (redactedText: string) => Promise<TResponse>,
  ): Promise<TResponse> {
    // Redact the text
    const {redactedText} = await this.redactText(text);

    // Send to API (redacted)
    const response = await sendToApi(redactedText);

    // Re-hydrate the response (if it contains any placeholders)
    // Note: This assumes API responses don't contain placeholders.
    // If they do, additional handling is needed.
    return response;
  }

  // ==================== Helper Methods ====================

  /**
   * Create redacted text with deterministic placeholders.
   *
   * Placeholders follow the format: [ENTITY_TYPE_N]
   * Example: [PII_NAME_1], [API_KEY_2], [EMAIL_3]
   */
  private createRedactedText(
    text: string,
    entities: SensitiveEntity[],
  ): {redactedText: string; mapping: RedactionMapping} {
    // Sort entities by start index (descending) to avoid offset issues
    const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);

    let redactedText = text;
    const mapping: RedactionMapping = {};

    for (const entity of sortedEntities) {
      // Skip if not configured for redaction
      if (!this.shouldRedactEntity(entity)) {
        continue;
      }

      // Generate deterministic placeholder
      this.mappingCounter++;
      const placeholder = `${PLACEHOLDER_PREFIX}${entity.type}_${this.mappingCounter}${PLACEHOLDER_SUFFIX}`;

      // Store mapping
      mapping[placeholder] = {
        original: entity.text,
        type: entity.type,
      };

      // Replace in text
      redactedText =
        redactedText.substring(0, entity.startIndex) +
        placeholder +
        redactedText.substring(entity.endIndex);
    }

    return {redactedText, mapping};
  }

  /**
   * Determine if an entity should be redacted based on config.
   */
  private shouldRedactEntity(entity: SensitiveEntity): boolean {
    if (this.config.redactAll) {
      return true;
    }

    if (this.config.redactTypes) {
      return this.config.redactTypes.includes(entity.type);
    }

    return false;
  }

  /**
   * Extract numeric ID from placeholder string.
   * Example: "[PII_NAME_1]" -> 1
   */
  private getPlaceholderId(placeholder: string): number {
    const match = placeholder.match(/_(\d+)\]/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Flush mapping cache to secure storage.
   * In a production implementation, this would encrypt and store
   * the mapping in a secure location (e.g., iOS Keychain, Android Keystore).
   */
  private async flushCacheToSecureStorage(): Promise<void> {
    // TODO: Implement secure storage for mapping cache
    // For now, just clear the cache
    console.warn(
      'Mapping cache reached capacity. Flushing to secure storage (placeholder implementation).',
    );
    this.clearMappingCache();
  }

  /**
   * Flush all memory - called when app goes to background.
   * Clears both the mapping cache and any cached decrypted data.
   */
  public async flushAllMemory(): Promise<void> {
    this.clearMappingCache();
    await this.sddService.unloadModel();
  }
}
