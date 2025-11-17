import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

/**
 * Comprehensive error handling utility
 * Provides user-friendly error messages and logs technical details for debugging
 */

// Firebase error code mappings
const FIREBASE_ERROR_MESSAGES = {
  // Authentication errors
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
  'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',

  // Firestore errors
  'permission-denied': "You don't have permission to perform this action.",
  'not-found': 'The requested data could not be found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please try again later.',
  'failed-precondition': 'Operation cannot be performed in the current state.',
  aborted: 'Operation was aborted. Please try again.',
  'out-of-range': 'Operation was attempted past the valid range.',
  unimplemented: 'This feature is not yet available.',
  internal: 'Internal server error. Please try again later.',
  unavailable: 'Service is temporarily unavailable. Please try again.',
  'data-loss': 'Data loss or corruption detected.',
  unauthenticated: 'You must be logged in to perform this action.',

  // Network errors
  NETWORK_ERROR: 'No internet connection. Please check your network.',
  TIMEOUT: 'Request timed out. Please try again.',
};

/**
 * Get user-friendly error message from error object
 * @param {Error} error - The error object
 * @param {string} defaultMessage - Default message if error can't be identified
 * @returns {string} User-friendly error message
 */
export function getUserMessage(error, defaultMessage = 'Something went wrong. Please try again.') {
  if (!error) return defaultMessage;

  // Check for Firebase error codes
  if (error.code) {
    const message = FIREBASE_ERROR_MESSAGES[error.code];
    if (message) return message;
  }

  // Check for network errors
  if (error.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('connection') || msg.includes('offline')) {
      return FIREBASE_ERROR_MESSAGES['NETWORK_ERROR'];
    }
    if (msg.includes('timeout')) {
      return FIREBASE_ERROR_MESSAGES['TIMEOUT'];
    }
  }

  return defaultMessage;
}

/**
 * Get technical error details for logging
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @returns {object} Detailed error information
 */
export function getErrorDetails(error, context = 'Unknown') {
  return {
    context,
    code: error?.code || 'UNKNOWN',
    message: error?.message || 'Unknown error',
    stack: error?.stack || 'No stack trace',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log error with context and details
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 */
export function logError(error, context = 'Unknown') {
  const details = getErrorDetails(error, context);
  console.error(`[ERROR] ${context}:`, {
    code: details.code,
    message: details.message,
    timestamp: details.timestamp,
  });

  // Store error logs locally for offline debugging
  saveErrorLog(details).catch(e => {
    console.error('Failed to save error log:', e);
  });

  // Send to Sentry if configured
  if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
    try {
      Sentry.captureException(error, {
        tags: {
          context,
        },
        extra: details,
      });
    } catch (e) {
      console.error('Failed to send error to Sentry:', e);
    }
  }
}

/**
 * Save error log to local storage
 * @param {object} errorDetails - Error details object
 */
async function saveErrorLog(errorDetails) {
  try {
    const logs = await AsyncStorage.getItem('error_logs');
    const errorLogs = logs ? JSON.parse(logs) : [];
    errorLogs.push(errorDetails);
    // Keep only last 50 errors to prevent storage bloat
    await AsyncStorage.setItem('error_logs', JSON.stringify(errorLogs.slice(-50)));
  } catch (e) {
    // Silently fail if storage is full or unavailable
    console.error('Storage error:', e);
  }
}

/**
 * Retrieve stored error logs
 * @returns {Promise<Array>} Array of error log objects
 */
export async function getErrorLogs() {
  try {
    const logs = await AsyncStorage.getItem('error_logs');
    return logs ? JSON.parse(logs) : [];
  } catch (e) {
    console.error('Failed to retrieve error logs:', e);
    return [];
  }
}

/**
 * Clear all stored error logs
 */
export async function clearErrorLogs() {
  try {
    await AsyncStorage.removeItem('error_logs');
  } catch (e) {
    console.error('Failed to clear error logs:', e);
  }
}

/**
 * Show error alert to user with appropriate message
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @param {string} title - Alert title (optional)
 */
export function showErrorAlert(error, context = 'Unknown', title = 'Error') {
  logError(error, context);
  const userMessage = getUserMessage(error);

  Alert.alert(title, userMessage, [{ text: 'OK', style: 'default' }], { cancelable: true });
}

/**
 * Handle operation with error catching and user feedback
 * @param {Function} operation - Async operation to perform
 * @param {string} context - Context description
 * @param {string} successMessage - Optional success message
 * @returns {Promise<any>} Operation result or null on error
 */
export async function handleOperation(operation, context, successMessage = null) {
  try {
    const result = await operation();
    if (successMessage) {
      Alert.alert('Success', successMessage);
    }
    return result;
  } catch (error) {
    showErrorAlert(error, context);
    return null;
  }
}

/**
 * Check if error is network-related
 * @param {Error} error - The error object
 * @returns {boolean} True if network error
 */
export function isNetworkError(error) {
  if (!error) return false;

  const code = error.code?.toLowerCase() || '';
  const message = error.message?.toLowerCase() || '';

  return (
    code.includes('network') ||
    code === 'unavailable' ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('offline')
  );
}

/**
 * Check if error is permission-related
 * @param {Error} error - The error object
 * @returns {boolean} True if permission error
 */
export function isPermissionError(error) {
  if (!error) return false;
  return error.code === 'permission-denied' || error.code === 'unauthenticated';
}

/**
 * Format error for display in UI
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @returns {object} Formatted error with user message and technical details
 */
export function formatError(error, context = 'Unknown') {
  return {
    userMessage: getUserMessage(error),
    technicalDetails: getErrorDetails(error, context),
    isNetworkError: isNetworkError(error),
    isPermissionError: isPermissionError(error),
  };
}
