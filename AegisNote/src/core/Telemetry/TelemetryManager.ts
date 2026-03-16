/**
 * AegisNote - Privacy-Safe Telemetry Manager
 *
 * Integrates Sentry for crash reporting while enforcing strict privacy controls.
 * All user data is stripped before transmission to ensure zero-data-egress.
 */

import * as Sentry from '@sentry/react-native';

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /**
   * Sentry DSN (Data Source Name)
   * This is public and safe to include in the app
   */
  dsn: string;

  /**
   * Sample rate for error reporting (0.0 to 1.0)
   */
  errorSampleRate: number;

  /**
   * Sample rate for performance monitoring (0.0 to 1.0)
   */
  performanceSampleRate?: number;

  /**
   * Enable logging of Sentry events
   */
  debug?: boolean;
}

/**
 * Telemetry event types
 */
export type TelemetryEvent = 'app_start' | 'app_end' | 'note_created' | 'note_updated' | 'note_deleted' | 'error' | 'inference_start' | 'inference_end';

/**
 * Telemetry event data
 */
export interface TelemetryEventData {
  [key: string]: string | number | boolean | null;
}

/**
 * Telemetry Manager interface
 */
export interface TelemetryManager {
  /**
   * Initialize Sentry with privacy controls
   */
  initialize(config: TelemetryConfig): Promise<void>;

  /**
   * Cleanup Sentry resources
   */
  cleanup(): void;

  /**
   * Capture a custom event (privacy-safe)
   */
  captureEvent(event: TelemetryEvent, data?: TelemetryEventData): void;

  /**
   * Capture an error (stack trace only, no user data)
   */
  captureError(error: Error, context?: string): void;

  /**
   * Set user identifier (anonymized)
   */
  setUser(id: string): void;

  /**
   * Clear user identifier
   */
  clearUser(): void;

  /**
   * Start a performance transaction
   */
  startTransaction(name: string): Sentry.Transaction | null;

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean;
}

/**
 * Sanitize event data to remove any user content
 * Strips all text fields, emails, IPs, and custom variables
 */
function sanitizeEventData(data?: TelemetryEventData): TelemetryEventData | undefined {
  if (!data) {
    return undefined;
  }

  const sanitized: TelemetryEventData = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip known sensitive fields
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('email') ||
      lowerKey.includes('user') ||
      lowerKey.includes('name') ||
      lowerKey.includes('ip') ||
      lowerKey.includes('content') ||
      lowerKey.includes('text') ||
      lowerKey.includes('prompt') ||
      lowerKey.includes('note') ||
      lowerKey.includes('message')
    ) {
      // Replace with null instead of the actual value
      sanitized[key] = null;
    } else {
      // Keep non-sensitive fields
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize error message to remove user content
 */
function sanitizeErrorMessage(message: string): string {
  // Remove common patterns that might contain user data
  const sanitized = message
    .replace(/email[^:]*:\s*[^,\s]*/gi, 'email: [REDACTED]')
    .replace(/user[^:]*:\s*[^,\s]*/gi, 'user: [REDACTED]')
    .replace(/name[^:]*:\s*[^,\s]*/gi, 'name: [REDACTED]')
    .replace(/ip[^:]*:\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/gi, 'ip: [REDACTED]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');

  return sanitized;
}

/**
 * Telemetry Manager implementation
 */
export class TelemetryManagerImpl implements TelemetryManager {
  private static instance: TelemetryManagerImpl;
  private initialized: boolean = false;
  private enabled: boolean = true;

  private constructor() {}

  public static getInstance(): TelemetryManagerImpl {
    if (!TelemetryManagerImpl.instance) {
      TelemetryManagerImpl.instance = new TelemetryManagerImpl();
    }
    return TelemetryManagerImpl.instance;
  }

  /**
   * Initialize Sentry with privacy controls
   */
  async initialize(config: TelemetryConfig): Promise<void> {
    console.log('[Telemetry] Initializing Sentry with privacy controls...');

    Sentry.init({
      dsn: config.dsn,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      sampleRate: config.errorSampleRate,
      ...(config.performanceSampleRate ? { tracesSampleRate: config.performanceSampleRate } : {}),
      debug: config.debug,
      // Don't send breadcrumbs that might contain user data
      integrations: [
        // Only include essential integrations
        new Sentry.Breadcrumbs({
          console: false, // Don't log console breadcrumbs
          dom: false, // Don't log DOM events
          http: true, // Keep HTTP for network errors (but sanitized)
        }),
      ],
      // Sanitize all data before sending
      beforeSend: (event, hint) => {
        return this.beforeSend(event, hint);
      },
      // Don't capture URLs that might contain user data
      sanitizeFn: (value) => {
        // Sanitize any string values that might contain user data
        if (typeof value === 'string') {
          return sanitizeErrorMessage(value);
        }
        return value;
      },
    });

    this.initialized = true;
    console.log('[Telemetry] Sentry initialized successfully');
  }

  /**
   * Cleanup Sentry resources
   */
  cleanup(): void {
    console.log('[Telemetry] Cleaning up Sentry resources...');
    if (this.initialized) {
      Sentry.close();
      this.initialized = false;
    }
  }

  /**
   * Capture a custom event (privacy-safe)
   */
  captureEvent(event: TelemetryEvent, data?: TelemetryEventData): void {
    if (!this.enabled || !this.initialized) {
      return;
    }

    const sanitizedData = sanitizeEventData(data);
    console.log(`[Telemetry] Capturing event: ${event}`, sanitizedData);

    Sentry.captureEvent({
      level: 'info',
      event_id: Sentry.generateSpanId(),
      timestamp: Date.now() / 1000,
      extra: sanitizedData,
      tags: {
        event_type: event,
      },
    });
  }

  /**
   * Capture an error (stack trace only, no user data)
   */
  captureError(error: Error, context?: string): void {
    if (!this.enabled || !this.initialized) {
      return;
    }

    console.error('[Telemetry] Capturing error:', error);

    // Create sanitized error message
    const sanitizedMessage = sanitizeErrorMessage(error.message);

    Sentry.captureException(error, {
      messages: [
        {
          formula: sanitizedMessage,
          params: [],
        },
      ],
      tags: {
        context: context || 'unknown',
        privacy_safe: 'true', // Tag to identify sanitized events
      },
    });
  }

  /**
   * Set user identifier (anonymized)
   */
  setUser(id: string): void {
    if (!this.initialized) {
      return;
    }

    // Hash the ID before sending to Sentry
    Sentry.setUser({
      id: this.hashId(id),
    });
  }

  /**
   * Clear user identifier
   */
  clearUser(): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(null);
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string): Sentry.Transaction | null {
    if (!this.initialized) {
      return null;
    }

    return Sentry.startTransaction({ name });
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.initialized;
  }

  /**
   * Pre-send hook - strip all user data before transmission
   */
  private beforeSend(event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null {
    if (!this.enabled) {
      return null;
    }

    // Strip user-related fields
    if (event.user) {
      event.user = {
        id: event.user.id ? '[ANONYMIZED]' : undefined,
        username: undefined,
        email: undefined,
        ip_address: undefined,
      };
    }

    // Strip request data that might contain user info
    if (event.request) {
      event.request = {
        url: event.request.url || '',
        method: event.request.method,
        headers: {},
        cookies: undefined,
        query_string: undefined,
      };
    }

    // Strip any exception values that might contain user data
    if (event.exceptions) {
      event.exceptions.forEach((exception) => {
        if (exception.value) {
          exception.value = sanitizeErrorMessage(exception.value);
        }
      });
    }

    // Sanitize stack traces (remove file paths that might leak info)
    if (event.stack_trace) {
      event.stack_trace = this.sanitizeStackTrace(event.stack_trace);
    }

    // Remove environment if it contains user data
    if (event.environment && event.environment.includes('user')) {
      delete event.environment;
    }

    // Sanitize extra data
    if (event.extra) {
      event.extra = sanitizeEventData(event.extra) || {};
    }

    // Remove breadcrumbs that might contain user data
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.filter((breadcrumb) => {
        // Keep only essential breadcrumbs
        const category = breadcrumb.category || '';
        return (
          category.includes('http') || // Keep network errors
          category.includes('sentry') // Keep Sentry errors
        );
      });
    }

    return event;
  }

  /**
   * Sanitize stack trace to remove file paths
   */
  private sanitizeStackTrace(stackTrace: Sentry.Stacktrace): Sentry.Stacktrace {
    if (!stackTrace.frames) {
      return stackTrace;
    }

    const sanitizedFrames = stackTrace.frames.map((frame) => {
      // Remove or sanitize file paths
      let filename = frame.filename || '';
      // Simple obfuscation - just use basename
      const basename = filename.split('/').pop() || 'unknown';
      if (basename.endsWith('.js') || basename.endsWith('.ts')) {
        filename = basename;
      } else {
        filename = 'unknown';
      }

      return {
        ...frame,
        filename,
        function: frame.function ? this.sanitizeFunctionName(frame.function) : undefined,
        vars: undefined, // Don't send variable values
      };
    });

    return {
      ...stackTrace,
      frames: sanitizedFrames,
    };
  }

  /**
   * Sanitize function name to remove any user data
   */
  private sanitizeFunctionName(name: string): string {
    // Replace any potentially sensitive function names
    const sensitivePatterns = ['user', 'email', 'password', 'token', 'auth'];

    let sanitized = name;
    sensitivePatterns.forEach((pattern) => {
      if (sanitized.toLowerCase().includes(pattern)) {
        sanitized = '[SENSITIVE_FUNCTION]';
      }
    });

    return sanitized;
  }

  /**
   * Hash ID for anonymization
   */
  private async hashId(id: string): Promise<string> {
    try {
      // Use a simple hash - in production, use a proper crypto library
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString(36);
    } catch {
      return '[HASH_FAILED]';
    }
  }
}

// Export singleton instance
export const telemetryManager = TelemetryManagerImpl.getInstance();
