/**
 * AegisNote - Model Download Constants
 *
 * Configuration for the on-device generative model download.
 */

/**
 * URL where the GGUF model file is hosted
 * TODO: Replace with actual model URL when available
 */
export const MODEL_DOWNLOAD_URL = 'https://example.com/models/aegisnote-gguf-1.5gb.gguf';

/**
 * Expected SHA-256 hash of the model file for integrity verification
 * TODO: Replace with actual hash when model is available
 */
export const MODEL_EXPECTED_SHA256 = '';

/**
 * Minimum free disk space required for model download and unpacking (3GB)
 * This accounts for:
 * - 1.5GB model file
 * - Temporary download space
 * - Unpacked/expanded model data
 */
export const MINIMUM_FREE_SPACE_BYTES = 3 * 1024 * 1024 * 1024; // 3GB

/**
 * Model file name (GGUF format)
 */
export const MODEL_FILE_NAME = 'aegisnote-model.gguf';

/**
 * Model cache directory name
 */
export const MODEL_CACHE_DIR = 'aegisnote_models';
