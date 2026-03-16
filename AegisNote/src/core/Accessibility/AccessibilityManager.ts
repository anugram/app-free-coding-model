/**
 * AegisNote - Accessibility Utilities
 *
 * Provides accessibility support for screen readers (VoiceOver/TalkBack).
 * Ensures all interactive elements have proper labels and the UI
 * announces processing states during LLM inference.
 */

import {AccessibilityInfo, Platform} from 'react-native';

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  /**
   * Enable screen reader support
   */
  enabled: boolean;

  /**
   * Announce messages to screen readers
   */
  announceForAccessibility: (message: string) => void;

  /**
   * Check if screen reader is enabled
   */
  isScreenReaderEnabled: () => Promise<boolean>;
}

/**
 * Accessibility Manager interface
 */
export interface AccessibilityManager {
  /**
   * Initialize accessibility features
   */
  initialize(): Promise<void>;

  /**
   * Check if screen reader is currently enabled
   */
  isScreenReaderEnabled(): Promise<boolean>;

  /**
   * Announce a message for screen readers
   */
  announceForAccessibility(message: string): void;

  /**
   * Set accessibility label on a component
   */
  setAccessibilityLabel(componentId: string, label: string): void;

  /**
   * Set accessibility hint for a component
   */
  setAccessibilityHint(componentId: string, hint: string): void;

  /**
   * Get accessibility configuration
   */
  getConfig(): AccessibilityConfig;
}

/**
 * Accessibility Manager implementation
 */
export class AccessibilityManagerImpl implements AccessibilityManager {
  private static instance: AccessibilityManagerImpl;
  private screenReaderEnabled: boolean = false;

  private constructor() {}

  public static getInstance(): AccessibilityManagerImpl {
    if (!AccessibilityManagerImpl.instance) {
      AccessibilityManagerImpl.instance = new AccessibilityManagerImpl();
    }
    return AccessibilityManagerImpl.instance;
  }

  /**
   * Initialize accessibility features
   */
  async initialize(): Promise<void> {
    console.log('[Accessibility] Initializing accessibility manager. .');

    // Check if screen reader is enabled
    this.screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
    console.log(`[Accessibility] Screen reader enabled: ${this.screenReaderEnabled}`);

    // Listen for changes
    this.changeSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      this.handleScreenReaderChange.bind(this),
    );

    console.log('[Accessibility] Accessibility manager initialized');
  }

  /**
   * Cleanup accessibility listeners
   */
  cleanup(): void {
    console.log('[Accessibility] Cleaning up accessibility listeners...');
    if (this.changeSubscription) {
      this.changeSubscription.remove();
    }
  }

  /**
   * Check if screen reader is currently enabled
   */
  async isScreenReaderEnabled(): Promise<boolean> {
    return await AccessibilityInfo.isScreenReaderEnabled();
  }

  /**
   * Announce a message for screen readers
   */
  announceForAccessibility(message: string): void {
    if (Platform.OS === 'android') {
      // Use NativeModules for Android accessibility
      const NativeModules = require('react-native').NativeModules;
      const RNA11y = NativeModules.RNA11y;
      if (RNA11y && typeof RNA11y.announceForAccessibility === 'function') {
        RNA11y.announceForAccessibility(message);
      }
    } else if (Platform.OS === 'ios') {
      // Use UIAccessibility for iOS
      const UIAccessibility = require('react-native').UIAccessibility;
      if (UIAccessibility && typeof UIAccessibility.announceForAccessibility === 'function') {
        UIAccessibility.announceForAccessibility(message);
      }
    }
  }

  /**
   * Set accessibility label on a component
   */
  setAccessibilityLabel(componentId: string, label: string): void {
    console.log(`[Accessibility] Setting label "${label}" for component "${componentId}"`);
    // This would be used in the UI layer to set accessibilityLabel props
  }

  /**
   * Set accessibility hint for a component
   */
  setAccessibilityHint(componentId: string, hint: string): void {
    console.log(`[Accessibility] Setting hint "${hint}" for component "${componentId}"`);
    // This would be used in the UI layer to set accessibilityHint props
  }

  /**
   * Get accessibility configuration
   */
  getConfig(): AccessibilityConfig {
    return {
      enabled: this.screenReaderEnabled,
      announceForAccessibility: this.announceForAccessibility.bind(this),
      isScreenReaderEnabled: this.isScreenReaderEnabled.bind(this),
    };
  }

  // Event handlers

  private handleScreenReaderChange(isEnabled: boolean): void {
    this.screenReaderEnabled = isEnabled;
    console.log(`[Accessibility] Screen reader status changed: ${isEnabled}`);

    // If screen reader is now enabled, announce a welcome message
    if (isEnabled) {
      this.announceForAccessibility('Accessibility features enabled. AegisNote is ready.');
    }
  }

  // Subscription reference
  private changeSubscription: any = null;
}

// Export singleton instance
export const accessibilityManager = AccessibilityManagerImpl.getInstance();
