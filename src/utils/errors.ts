import { ERROR_CODES } from '../constants/config';
import type { AppError, ErrorRecoveryStrategy } from '../types';

/**
 * Error handling utilities for TallyGO
 */

/**
 * Create a standardized app error
 */
export function createAppError(
  code: string,
  message: string,
  details?: any
): AppError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create network error
 */
export function createNetworkError(message: string, details?: any): AppError {
  return createAppError(ERROR_CODES.NETWORK_ERROR, message, details);
}

/**
 * Create authentication error
 */
export function createAuthError(message: string, details?: any): AppError {
  return createAppError(ERROR_CODES.AUTH_ERROR, message, details);
}

/**
 * Create validation error
 */
export function createValidationError(message: string, details?: any): AppError {
  return createAppError(ERROR_CODES.VALIDATION_ERROR, message, details);
}

/**
 * Create storage error
 */
export function createStorageError(message: string, details?: any): AppError {
  return createAppError(ERROR_CODES.STORAGE_ERROR, message, details);
}

/**
 * Create sync error
 */
export function createSyncError(message: string, details?: any): AppError {
  return createAppError(ERROR_CODES.SYNC_ERROR, message, details);
}

/**
 * Create permission error
 */
export function createPermissionError(message: string, details?: any): AppError {
  return createAppError(ERROR_CODES.PERMISSION_ERROR, message, details);
}



/**
 * Parse error from unknown source
 */
export function parseError(error: unknown): AppError {
  if (error instanceof Error) {
    return createAppError('UNKNOWN_ERROR', error.message, {
      name: error.name,
      stack: error.stack
    });
  }

  if (typeof error === 'string') {
    return createAppError('UNKNOWN_ERROR', error);
  }

  return createAppError('UNKNOWN_ERROR', 'An unknown error occurred', error);
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: AppError): boolean {
  const recoverableCodes: string[] = [
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.SYNC_ERROR
  ];
  return recoverableCodes.includes(error.code);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.NETWORK_ERROR:
      return 'Network connection failed. Please check your internet connection and try again.';

    case ERROR_CODES.AUTH_ERROR:
      return 'Authentication failed. Please check your credentials and try again.';

    case ERROR_CODES.VALIDATION_ERROR:
      return error.message || 'Invalid input. Please check your data and try again.';

    case ERROR_CODES.STORAGE_ERROR:
      return 'Failed to save data. Please try again.';

    case ERROR_CODES.SYNC_ERROR:
      return 'Failed to sync data. Your changes are saved locally and will sync when connection is restored.';

    case ERROR_CODES.PERMISSION_ERROR:
      return 'Permission denied. Please check your app permissions in settings.';



    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Create error recovery strategy
 */
export function createErrorRecoveryStrategy(
  error: AppError,
  retryFn: () => Promise<void>,
  fallbackFn?: () => Promise<void>
): ErrorRecoveryStrategy {
  return {
    retry: retryFn,
    fallback: fallbackFn || (async () => { }),
    userAction: getUserFriendlyMessage(error),
    canRecover: isRecoverableError(error)
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Safe async function wrapper that catches and logs errors
 */
export function safeAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallbackValue?: R
): (...args: T) => Promise<R | undefined> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Safe async function error:', error);
      return fallbackValue;
    }
  };
}

/**
 * Log error for debugging and monitoring
 */
export function logError(error: AppError, context?: string): void {
  const logData = {
    ...error,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location?.href : 'unknown'
  };

  console.error('TallyGO Error:', logData);

  // In production, you might want to send this to a logging service
  // Example: sendToLoggingService(logData)
}

/**
 * Handle async errors in React components
 */
export function handleAsyncError(error: unknown, context: string): AppError {
  const appError = parseError(error);
  logError(appError, context);
  return appError;
}