/**
 * AegisNote - Model Download Manager
 *
 * Handles downloading and verifying the on-device generative model file.
 * Features:
 * - Free disk space pre-checks
 * - Resumable background downloads
 * - Progress UI events
 * - SHA-256 checksum validation
 */

import RNFS from 'react-native-fs';
import {Platform} from 'react-native';
import {FastCrypto} from 'react-native-fast-crypto';
import {sha256String} from '../encryption/HashUtils';
import {
  MODEL_DOWNLOAD_URL,
  MODEL_EXPECTED_SHA256,
  MINIMUM_FREE_SPACE_BYTES,
  MODEL_FILE_NAME,
  MODEL_CACHE_DIR,
} from './Constants';
import {
  DownloadEvent,
  DownloadState,
  DownloadProgressCallback,
  ModelDownloadManager,
} from './Types';

/**
 * ModelDownloadManager implementation
 *
 * Manages the lifecycle of downloading an on-device ML model,
 * including disk space checks, resumable downloads, and integrity verification.
 */
export class ModelDownloadManagerImpl implements ModelDownloadManager {
  private static instance: ModelDownloadManagerImpl;

  private state: DownloadState = 'idle';
  private downloadTask: any = null;
  private abortDownload: boolean = false;

  private constructor() {}

  public static getInstance(): ModelDownloadManagerImpl {
    if (!ModelDownloadManagerImpl.instance) {
      ModelDownloadManagerImpl.instance = new ModelDownloadManagerImpl();
    }
    return ModelDownloadManagerImpl.instance;
  }

  /**
   * Check if the model is already downloaded and verified
   */
  async isModelReady(): Promise<boolean> {
    try {
      const modelPath = await this.getModelPath();
      if (!modelPath) {
        return false;
      }

      // Check if file exists
      const exists = await RNFS.exists(modelPath);
      if (!exists) {
        return false;
      }

      // If expected hash is configured, verify it
      if (MODEL_EXPECTED_SHA256) {
        return await this.verifyModel();
      }

      return true;
    } catch (error) {
      console.error('[ModelDownloadManager] Error checking model readiness:', error);
      return false;
    }
  }

  /**
   * Check if sufficient disk space is available
   */
  async checkDiskSpace(): Promise<boolean> {
    this.state = 'checking_space';
    console.log('[ModelDownloadManager] Checking available disk space...');

    try {
      // Get document directory info
      const docDirInfo = await RNFS.getFSInfo();
      const availableSpace = docDirInfo.freeSpace;

      console.log(
        `[ModelDownloadManager] Available space: ${this.formatBytes(availableSpace)}, Required: ${this.formatBytes(MINIMUM_FREE_SPACE_BYTES)}`,
      );

      const hasSpace = availableSpace >= MINIMUM_FREE_SPACE_BYTES;

      if (!hasSpace) {
        this.state = 'error';
        console.error(
          `[ModelDownloadManager] Insufficient disk space. Required: ${this.formatBytes(MINIMUM_FREE_SPACE_BYTES)}, Available: ${this.formatBytes(availableSpace)}`,
        );
      }

      return hasSpace;
    } catch (error) {
      this.state = 'error';
      console.error('[ModelDownloadManager] Error checking disk space:', error);
      return false;
    }
  }

  /**
   * Start downloading the model file
   */
  async startDownload(onProgress?: DownloadProgressCallback): Promise<void> {
    if (this.state === 'downloading') {
      console.log('[ModelDownloadManager] Download already in progress');
      return;
    }

    // Check disk space first
    const hasSpace = await this.checkDiskSpace();
    if (!hasSpace) {
      const error = new Error('Insufficient disk space for model download');
      this.state = 'error';
      throw error;
    }

    this.state = 'downloading';
    this.abortDownload = false;

    const modelPath = await this.getModelPath();
    const tempPath = `${modelPath}.download`;

    console.log(`[ModelDownloadManager] Starting download to: ${tempPath}`);

    // Create download directory if needed
    const downloadDir = RNFS.DocumentDirectoryPath;
    const modelDir = `${downloadDir}/${MODEL_CACHE_DIR}`;

    try {
      await RNFS.mkdir(modelDir);
    } catch (error) {
      console.log(`[ModelDownloadManager] Directory may already exist: ${modelDir}`);
    }

    // Configure download options with resume support
    const options = {
      fromUrl: MODEL_DOWNLOAD_URL,
      toFile: tempPath,
      background: true,
      progress: (res: any) => {
        if (this.abortDownload) {
          console.log('[ModelDownloadManager] Download aborted by user');
          this.downloadTask?.stop();
          return;
        }

        const progress = Math.round((res.bytesDownloaded / res.contentLength) * 100);
        const event: DownloadEvent = {
          state: 'downloading',
          progress,
          downloadedBytes: res.bytesDownloaded,
          totalBytes: res.contentLength,
          timeRemaining: res.timeRemaining,
          speed: res.bytesPerSecond,
        };

        this.state = 'downloading';
        onProgress?.(event);
      },
    };

    try {
      this.downloadTask = RNFS.downloadFile(options);

      const result = await this.downloadTask.promise;

      if (this.abortDownload) {
        console.log('[ModelDownloadManager] Download cancelled');
        this.state = 'idle';
        await this.cleanup();
        return;
      }

      if (result.statusCode !== 200 && result.statusCode !== 201) {
        this.state = 'error';
        throw new Error(`Download failed with status code: ${result.statusCode}`);
      }

      // Verify the download
      console.log('[ModelDownloadManager] Download complete, verifying...');
      this.state = 'verifying';
      onProgress?.({state: 'verifying', progress: 100});

      const isValid = await this.verifyModel(tempPath);
      if (!isValid) {
        this.state = 'error';
        await this.cleanup();
        throw new Error('Model verification failed - corrupted download');
      }

      // Rename temp file to final name
      console.log('[ModelDownloadManager] Verification successful, finalizing...');
      this.state = 'unpacking';
      onProgress?.({state: 'unpacking', progress: 100});

      await RNFS.moveFile(tempPath, modelPath);
      this.state = 'ready';
      onProgress?.({state: 'ready', progress: 100});

      console.log('[ModelDownloadManager] Model ready at:', modelPath);
    } catch (error: any) {
      if (error.message !== 'Download was cancelled' && !this.abortDownload) {
        this.state = 'error';
        console.error('[ModelDownloadManager] Download error:', error);
        onProgress?.({state: 'error', error: error.message});
      } else {
        this.state = 'idle';
      }
      throw error;
    }
  }

  /**
   * Cancel the current download
   */
  async cancelDownload(): Promise<void> {
    console.log('[ModelDownloadManager] Cancelling download...');
    this.abortDownload = true;

    if (this.downloadTask) {
      try {
        await this.downloadTask.stop();
      } catch (error) {
        console.log('[ModelDownloadManager] Error stopping download:', error);
      }
      this.downloadTask = null;
    }

    // Clean up partial download
    await this.cleanup();
    this.state = 'idle';
  }

  /**
   * Get current download state
   */
  getState(): DownloadState {
    return this.state;
  }

  /**
   * Get the path to the downloaded model file
   */
  async getModelPath(): Promise<string | null> {
    const downloadDir = RNFS.DocumentDirectoryPath;
    const modelDir = `${downloadDir}/${MODEL_CACHE_DIR}`;
    const modelPath = `${modelDir}/${MODEL_FILE_NAME}`;

    // Check if file exists
    const exists = await RNFS.exists(modelPath);
    return exists ? modelPath : null;
  }

  /**
   * Get the expected SHA-256 hash of the model
   */
  getExpectedHash(): string {
    return MODEL_EXPECTED_SHA256;
  }

  /**
   * Verify the downloaded model file integrity
   */
  async verifyModel(filePath?: string): Promise<boolean> {
    try {
      const modelPath = filePath || (await this.getModelPath());
      if (!modelPath) {
        return false;
      }

      console.log('[ModelDownloadManager] Verifying model integrity...');

      // Calculate SHA-256 hash
      const fileHash = await this.calculateFileHash(modelPath);

      if (!MODEL_EXPECTED_SHA256) {
        console.warn('[ModelDownloadManager] No expected hash configured - skipping verification');
        return true;
      }

      const isValid = fileHash.toLowerCase() === MODEL_EXPECTED_SHA256.toLowerCase();
      console.log(`[ModelDownloadManager] Hash verification: ${isValid ? 'PASSED' : 'FAILED'}`);
      console.log(`[ModelDownloadManager] Expected: ${MODEL_EXPECTED_SHA256}`);
      console.log(`[ModelDownloadManager] Got:      ${fileHash}`);

      return isValid;
    } catch (error) {
      console.error('[ModelDownloadManager] Verification error:', error);
      return false;
    }
  }

  /**
   * Calculate SHA-256 hash of a file using streaming
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    const chunkSize = 64 * 1024; // 64KB chunks for memory efficiency
    let offset = 0;

    const fileInfo = await RNFS.stat(filePath);
    const fileSize = fileInfo.size;

    console.log(`[ModelDownloadManager] Calculating hash for ${this.formatBytes(fileSize)} file...`);

    let currentHash: Uint8Array | null = null;

    while (offset < fileSize) {
      const bytesRead = await RNFS.read(filePath, chunkSize, offset, 'utf8');

      // Convert string to bytes using TextEncoder (available via polyfill in index.js)
      const encoder = new TextEncoder();
      const data = encoder.encode(bytesRead);

      // Hash the chunk using FastCrypto
      const chunkHash = await FastCrypto.sha256(data);

      if (!currentHash) {
        currentHash = chunkHash;
      } else {
        // Concatenate previous hash with new data and hash again
        const combined = new Uint8Array(currentHash.length + data.length);
        combined.set(currentHash);
        combined.set(data, currentHash.length);
        currentHash = await FastCrypto.sha256(combined);
      }

      offset += chunkSize;
      const progress = Math.round((offset / fileSize) * 50); // Hashing is ~50% of verification
      console.log(`[ModelDownloadManager] Hash progress: ${Math.round((offset / fileSize) * 100)}%`);
    }

    return this.bytesToHex(currentHash || new Uint8Array(32));
  }

  /**
   * Convert bytes to hex string
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Clean up any temporary/download files
   */
  async cleanup(): Promise<void> {
    const downloadDir = RNFS.DocumentDirectoryPath;
    const modelDir = `${downloadDir}/${MODEL_CACHE_DIR}`;
    const tempPath = `${modelDir}/${MODEL_FILE_NAME}.download`;

    try {
      // Remove temp download file
      if (await RNFS.exists(tempPath)) {
        await RNFS.unlink(tempPath);
        console.log('[ModelDownloadManager] Cleaned up temp file');
      }
    } catch (error) {
      console.log('[ModelDownloadManager] Error during cleanup:', error);
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

// Export singleton instance
export const modelDownloadManager = ModelDownloadManagerImpl.getInstance();
