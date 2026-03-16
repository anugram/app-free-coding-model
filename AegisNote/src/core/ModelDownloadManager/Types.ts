/**
 * AegisNote - Model Download Manager State Types
 *
 * Defines the state and events for the model download process.
 */

/**
 * Current state of the model download process
 */
export type DownloadState = 'idle' | 'checking_space' | 'downloading' | 'verifying' | 'unpacking' | 'ready' | 'error';

/**
 * Download event payload
 */
export interface DownloadEvent {
  /**
   * Current state of the download
   */
  state: DownloadState;

  /**
   * Progress percentage (0-100)
   */
  progress?: number;

  /**
   * Downloaded bytes so far
   */
  downloadedBytes?: number;

  /**
   * Total bytes to download
   */
  totalBytes?: number;

  /**
   * Error message (if in error state)
   */
  error?: string;

  /**
   * Estimated time remaining in seconds
   */
  timeRemaining?: number;

  /**
   * Current download speed in bytes/second
   */
  speed?: number;
}

/**
 * Callback function for download progress updates
 */
export type DownloadProgressCallback = (event: DownloadEvent) => void;

/**
 * Model download manager interface
 */
export interface ModelDownloadManager {
  /**
   * Check if the model is already downloaded and verified
   */
  isModelReady(): Promise<boolean>;

  /**
   * Check if sufficient disk space is available
   */
  checkDiskSpace(): Promise<boolean>;

  /**
   * Start downloading the model file
   * @param onProgress - Optional callback for progress updates
   */
  startDownload(onProgress?: DownloadProgressCallback): Promise<void>;

  /**
   * Cancel the current download
   */
  cancelDownload(): Promise<void>;

  /**
   * Get current download state
   */
  getState(): DownloadState;

  /**
   * Get the path to the downloaded model file
   */
  getModelPath(): Promise<string | null>;

  /**
   * Get the expected SHA-256 hash of the model
   */
  getExpectedHash(): string;

  /**
   * Verify the downloaded model file integrity
   */
  verifyModel(): Promise<boolean>;

  /**
   * Clean up any temporary/download files
   */
  cleanup(): Promise<void>;
}
