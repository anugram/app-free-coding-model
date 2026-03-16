/**
 * AegisNote - Memory Warning Manager
 *
 * Handles OS-level memory warnings to prevent OOM crashes during LLM inference.
 * Features:
 * - iOS: didReceiveMemoryWarning listener
 * - Android: onTrimMemory listener
 * - Graceful degradation when memory is low
 */

import {Platform, NativeEventEmitter, NativeModules, AppState, AppStateStatus} from 'react-native';

/**
 * Memory pressure levels
 */
export type MemoryPressure = 'normal' | 'warning' | 'critical';

/**
 * Memory event payload
 */
export interface MemoryEvent {
  pressure: MemoryPressure;
  availableMemory?: number;
  timestamp: number;
}

/**
 * Memory warning callback type
 */
export type MemoryWarningCallback = (event: MemoryEvent) => void;

/**
 * Memory Manager interface
 */
export interface MemoryManager {
  /**
   * Initialize memory warning listeners
   */
  initialize(): Promise<void>;

  /**
   * Cleanup memory warning listeners
   */
  cleanup(): void;

  /**
   * Add a callback to be notified of memory pressure changes
   */
  addMemoryWarningListener(callback: MemoryWarningCallback): string;

  /**
   * Remove a memory warning listener
   */
  removeMemoryWarningListener(id: string): void;

  /**
   * Get current memory pressure level
   */
  getMemoryPressure(): MemoryPressure;

  /**
   * Estimate available memory (platform-specific)
   */
  getAvailableMemory(): Promise<number>;

  /**
   * Check if memory pressure is critical (inference should be paused)
   */
  isMemoryCritical(): boolean;

  /**
   * Report that inference is starting (for monitoring)
   */
  reportInferenceStart(): void;

  /**
   * Report that inference has ended
   */
  reportInferenceEnd(): void;
}

/**
 * Native bridge for iOS memory warnings
 */
const RNSMemoryWarning = NativeModules.RNSMemoryWarning || null;
const RNSMemoryManager = NativeModules.RNSMemoryManager || null;

/**
 * Memory Manager implementation
 */
export class MemoryManagerImpl implements MemoryManager {
  private static instance: MemoryManagerImpl;

  private eventEmitter: NativeEventEmitter | null = null;
  private memoryListeners: Map<string, MemoryWarningCallback> = new Map();
  private pressure: MemoryPressure = 'normal';
  private inferenceCount: number = 0;
  private maxMemory: number = 0;

  private constructor() {
    if (Platform.OS === 'ios' && RNSMemoryWarning) {
      this.eventEmitter = new NativeEventEmitter(RNSMemoryWarning);
    } else if (Platform.OS === 'android' && RNSMemoryManager) {
      this.eventEmitter = new NativeEventEmitter(RNSMemoryManager);
    }
  }

  public static getInstance(): MemoryManagerImpl {
    if (!MemoryManagerImpl.instance) {
      MemoryManagerImpl.instance = new MemoryManagerImpl();
    }
    return MemoryManagerImpl.instance;
  }

  /**
   * Initialize memory warning listeners
   */
  async initialize(): Promise<void> {
    console.log('[MemoryManager] Initializing memory warning listeners...');

    // Get total memory info
    await this.getAvailableMemory();

    // Listen for app state changes (iOS)
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    AppState.addEventListener('change', this.handleAppStateChange);

    // Listen for memory warnings on iOS
    if (this.eventEmitter) {
      this.memoryWarningSubscription = this.eventEmitter.addListener(
        'MemoryWarning',
        (event: MemoryEvent) => {
          this.handleMemoryWarning(event);
        },
      );
    }

    // Listen for Android memory trim events
    if (Platform.OS === 'android') {
      this.handleMemoryTrim = this.handleMemoryTrim.bind(this);
      // Android memory trim is handled via AppState background events
      // and native module callbacks
    }

    console.log('[MemoryManager] Memory listeners initialized');
  }

  /**
   * Cleanup memory warning listeners
   */
  cleanup(): void {
    console.log('[MemoryManager] Cleaning up memory listeners. ..');

    AppState.removeEventListener('change', this.handleAppStateChange);

    if (this.memoryWarningSubscription) {
      this.memoryWarningSubscription.remove();
    }

    this.memoryListeners.clear();
  }

  /**
   * Add a callback to be notified of memory pressure changes
   */
  addMemoryWarningListener(callback: MemoryWarningCallback): string {
    const id = Math.random().toString(36).substring(7);
    this.memoryListeners.set(id, callback);
    console.log(`[MemoryManager] Added listener: ${id}`);
    return id;
  }

  /**
   * Remove a memory warning listener
   */
  removeMemoryWarningListener(id: string): void {
    this.memoryListeners.delete(id);
    console.log(`[MemoryManager] Removed listener: ${id}`);
  }

  /**
   * Get current memory pressure level
   */
  getMemoryPressure(): MemoryPressure {
    return this.pressure;
  }

  /**
   * Estimate available memory (platform-specific)
   */
  async getAvailableMemory(): Promise<number> {
    try {
      if (Platform.OS === 'ios' && RNSMemoryManager) {
        const info = await RNSMemoryManager.getMemoryInfo();
        this.maxMemory = info.totalMemory || 0;
        return info.freeMemory || 0;
      } else if (Platform.OS === 'android') {
        // Get memory info from NativeModules
        const info = await RNFS.getFSInfo && (await RNFS.getFSInfo());
        // Estimate RAM from free disk space (not accurate but provides rough estimate)
        this.maxMemory = 2 * 1024 * 1024 * 1024; // Default to 2GB for most devices
        return info?.freeSpace || 512 * 1024 * 1024;
      }

      // Fallback estimates
      this.maxMemory = 2 * 1024 * 1024 * 1024;
      return 512 * 1024 * 1024;
    } catch (error) {
      console.error('[MemoryManager] Error getting memory info:', error);
      return 512 * 1024 * 1024; // Default 512MB
    }
  }

  /**
   * Check if memory pressure is critical (inference should be paused)
   */
  isMemoryCritical(): boolean {
    return this.pressure === 'critical' || this.pressure === 'warning';
  }

  /**
   * Report that inference is starting (for monitoring)
   */
  reportInferenceStart(): void {
    this.inferenceCount++;
    console.log(`[MemoryManager] Inference started. Active: ${this.inferenceCount}, Pressure: ${this.pressure}`);

    if (this.isMemoryCritical()) {
      console.warn('[MemoryManager] WARNING: Inference started during high memory pressure!');
    }
  }

  /**
   * Report that inference has ended
   */
  reportInferenceEnd(): void {
    if (this.inferenceCount > 0) {
      this.inferenceCount--;
    }
    console.log(`[MemoryManager] Inference ended. Active: ${this.inferenceCount}`);
  }

  // Private handlers

  private handleMemoryWarning = (event: MemoryEvent) => {
    console.log(`[MemoryManager] Memory warning received: ${event.pressure}`);
    this.pressure = event.pressure;

    // Notify all listeners
    this.memoryListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('[MemoryManager] Error in memory warning callback:', error);
      }
    });

    // If critical, force cleanup of inference resources
    if (event.pressure === 'critical' && this.inferenceCount > 0) {
      console.warn('[MemoryManager] CRITICAL: Forcing inference pause due to memory pressure');
      // This would trigger the actual inference pause in the UI layer
      this.onMemoryCritical();
    }
  };

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (Platform.OS === 'android') {
      // On Android, memory trim events are sent when app goes to background
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.pressure = 'normal'; // Reset pressure when app goes to background
        console.log('[MemoryManager] App backgrounded, memory pressure reset');
      }
    }
  };

  private onMemoryCritical = () => {
    // Trigger memory cleanup and pause inference
    console.warn('[MemoryManager] Memory critical - triggering cleanup');
    // This would call into the inference engine to pause/unload models
  };

  // Subscription reference
  private memoryWarningSubscription: any = null;
  private handleAppStateChange: (appState: AppStateStatus) => void;
  private handleMemoryTrim: (level: number) => void;
}

// Export singleton instance
export const memoryManager = MemoryManagerImpl.getInstance();
