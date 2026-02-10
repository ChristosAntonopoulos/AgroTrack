/**
 * Storage Cleanup Utility
 * 
 * Validates and sanitizes AsyncStorage data on app startup to prevent
 * boolean casting errors and ensure data integrity.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeTasks, sanitizeFields } from './dataSanitizer';
import { toBoolean } from './booleanConverter';

// Define all storage keys used by the app
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  TASKS: '@olive_lifecycle_tasks',
  SYNC_QUEUE: 'syncQueue',
} as const;

/**
 * Validates and sanitizes token storage
 * Token must be a non-empty string
 */
const validateToken = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token === null) {
      console.log('  ✓ Token: Not found (user not logged in)');
      return true;
    }
    
    // Token must be a non-empty string
    if (typeof token !== 'string' || token.trim() === '') {
      console.warn('  ✗ Token: Invalid format (type: ' + typeof token + '), clearing');
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      return false;
    }
    
    console.log('  ✓ Token: Valid (length: ' + token.length + ')');
    return true;
  } catch (error) {
    console.error('  ✗ Token: Error validating -', error);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch (clearError) {
      console.error('  ✗ Token: Error clearing -', clearError);
    }
    return false;
  }
};

/**
 * Validates and sanitizes user storage
 * User must be a valid object with userId property
 */
const validateUser = async (): Promise<boolean> => {
  try {
    const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (userStr === null) {
      console.log('  ✓ User: Not found (user not logged in)');
      return true;
    }
    
    try {
      const userData = JSON.parse(userStr);
      console.log('  → User: Found data, validating structure...');
      
      // User must be an object with userId
      if (!userData || typeof userData !== 'object' || !userData.userId) {
        console.warn('  ✗ User: Invalid structure (missing userId or not an object), clearing');
        console.warn('    Data type: ' + typeof userData + ', has userId: ' + !!userData?.userId);
        await clearUserData();
        return false;
      }
      
      // Validate required fields are present and correct types
      const hasUserId = typeof userData.userId === 'string';
      const hasEmail = typeof userData.email === 'string';
      const hasRole = typeof userData.role === 'string';
      
      if (!hasUserId || !hasEmail || !hasRole) {
        console.warn('  ✗ User: Missing required fields or wrong types');
        console.warn('    userId: ' + typeof userData.userId + ', email: ' + typeof userData.email + ', role: ' + typeof userData.role);
        await clearUserData();
        return false;
      }
      
      // Check for any boolean fields that might be strings
      const booleanFields = Object.keys(userData).filter(key => {
        const value = userData[key];
        return typeof value === 'string' && (value === 'true' || value === 'false');
      });
      
      if (booleanFields.length > 0) {
        console.warn('  ⚠ User: Found string booleans in fields: ' + booleanFields.join(', '));
        console.warn('    This could cause casting errors!');
      }
      
      console.log('  ✓ User: Valid (userId: ' + userData.userId + ', email: ' + userData.email + ', role: ' + userData.role + ')');
      return true;
    } catch (parseError) {
      console.error('  ✗ User: Error parsing JSON -', parseError);
      await clearUserData();
      return false;
    }
  } catch (error) {
    console.error('  ✗ User: Error validating -', error);
    try {
      await clearUserData();
    } catch (clearError) {
      console.error('  ✗ User: Error clearing -', clearError);
    }
    return false;
  }
};

/**
 * Validates and sanitizes tasks storage
 * Tasks must be an array, and each task's boolean fields are sanitized
 */
const validateTasks = async (): Promise<boolean> => {
  try {
    const tasksStr = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    if (tasksStr === null) {
      console.log('  ✓ Tasks: Not found (no persisted tasks)');
      return true;
    }
    
    try {
      const tasksData = JSON.parse(tasksStr);
      console.log('  → Tasks: Found data (' + (Array.isArray(tasksData) ? tasksData.length : 'N/A') + ' items), validating...');
      
      // Tasks must be an array
      if (!Array.isArray(tasksData)) {
        console.warn('  ✗ Tasks: Not an array (type: ' + typeof tasksData + '), clearing');
        await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
        return false;
      }
      
      // Check for string booleans before sanitization
      let stringBooleanCount = 0;
      tasksData.forEach((task: any, index: number) => {
        if (task && typeof task === 'object') {
          Object.keys(task).forEach(key => {
            const value = task[key];
            if (typeof value === 'string' && (value === 'true' || value === 'false')) {
              stringBooleanCount++;
              console.warn('    ⚠ Task[' + index + '].' + key + ': Found string boolean "' + value + '"');
            }
          });
        }
      });
      
      if (stringBooleanCount > 0) {
        console.warn('  ⚠ Tasks: Found ' + stringBooleanCount + ' string boolean(s) that will be sanitized');
      }
      
      // Sanitize tasks to ensure boolean values are strict booleans
      const sanitizedTasks = sanitizeTasks(tasksData);
      
      // Save sanitized tasks back to storage
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(sanitizedTasks));
      
      if (stringBooleanCount > 0) {
        console.log('  ✓ Tasks: Sanitized and saved (' + sanitizedTasks.length + ' tasks)');
      } else {
        console.log('  ✓ Tasks: Valid (' + sanitizedTasks.length + ' tasks)');
      }
      
      return true;
    } catch (parseError) {
      console.error('  ✗ Tasks: Error parsing JSON -', parseError);
      await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
      return false;
    }
  } catch (error) {
    console.error('  ✗ Tasks: Error validating -', error);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
    } catch (clearError) {
      console.error('  ✗ Tasks: Error clearing -', clearError);
    }
    return false;
  }
};

/**
 * Validates and sanitizes sync queue storage
 * Sync queue must be an array
 */
const validateSyncQueue = async (): Promise<boolean> => {
  try {
    const queueStr = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    if (queueStr === null) {
      console.log('  ✓ Sync Queue: Not found (no pending operations)');
      return true;
    }
    
    try {
      const queueData = JSON.parse(queueStr);
      console.log('  → Sync Queue: Found data (' + (Array.isArray(queueData) ? queueData.length : 'N/A') + ' items), validating...');
      
      // Queue must be an array
      if (!Array.isArray(queueData)) {
        console.warn('  ✗ Sync Queue: Not an array (type: ' + typeof queueData + '), clearing');
        await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
        return false;
      }
      
      // Validate each operation has required fields
      const validQueue = queueData.filter((op: any) => {
        return op && 
               typeof op === 'object' &&
               typeof op.id === 'string' &&
               typeof op.method === 'string' &&
               typeof op.endpoint === 'string' &&
               typeof op.timestamp === 'number';
      });
      
      // If some operations were invalid, save the valid ones
      if (validQueue.length !== queueData.length) {
        const removedCount = queueData.length - validQueue.length;
        console.warn('  ⚠ Sync Queue: Removed ' + removedCount + ' invalid operation(s)');
        if (validQueue.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(validQueue));
          console.log('  ✓ Sync Queue: Saved ' + validQueue.length + ' valid operation(s)');
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
          console.log('  ✓ Sync Queue: Cleared (no valid operations)');
        }
      } else {
        console.log('  ✓ Sync Queue: Valid (' + validQueue.length + ' operations)');
      }
      
      return true;
    } catch (parseError) {
      console.error('  ✗ Sync Queue: Error parsing JSON -', parseError);
      await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      return false;
    }
  } catch (error) {
    console.error('  ✗ Sync Queue: Error validating -', error);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    } catch (clearError) {
      console.error('  ✗ Sync Queue: Error clearing -', clearError);
    }
    return false;
  }
};

/**
 * Main cleanup function that validates and sanitizes all AsyncStorage data
 * Should be called on app startup before any data is read
 * 
 * This function is idempotent - it can be called multiple times safely
 */
let cleanupInProgress = false;
let cleanupCompleted = false;

export const cleanupStorage = async (): Promise<void> => {
  // Prevent multiple simultaneous cleanups
  if (cleanupInProgress) {
    console.log('Cleanup already in progress, waiting...');
    // Wait for existing cleanup to complete
    while (cleanupInProgress) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return;
  }

  // If cleanup already completed successfully, skip
  if (cleanupCompleted) {
    console.log('Cleanup already completed, skipping...');
    return;
  }

  cleanupInProgress = true;
  
  try {
    console.log('Starting AsyncStorage cleanup...');
    
    // Always clear user and token data on startup to prevent boolean casting errors
    // This forces a fresh login and ensures no corrupted data persists
    console.log('  → Clearing user and token data for fresh start...');
    try {
      await clearUserData();
      console.log('  ✓ User and token data cleared');
    } catch (clearError) {
      console.error('  ✗ Error clearing user data:', clearError);
    }
    
    // Validate all storage keys sequentially to ensure proper order
    // (tasks and sync queue validation)
    await validateTasks();
    await validateSyncQueue();
    
    cleanupCompleted = true;
    console.log('AsyncStorage cleanup completed successfully');
  } catch (error) {
    console.error('Unexpected error during storage cleanup:', error);
    // Reset flag so cleanup can be retried
    cleanupCompleted = false;
    // Don't throw - cleanup errors shouldn't prevent app from starting
  } finally {
    cleanupInProgress = false;
  }
};

/**
 * Force cleanup to run again (useful for testing or recovery)
 */
export const resetCleanup = (): void => {
  cleanupCompleted = false;
  cleanupInProgress = false;
};

/**
 * Clears all app-related AsyncStorage data
 * Useful for debugging or resetting the app state
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
      AsyncStorage.removeItem(STORAGE_KEYS.TASKS),
      AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE),
    ]);
    console.log('All AsyncStorage data cleared');
  } catch (error) {
    console.error('Error clearing AsyncStorage:', error);
    throw error;
  }
};

/**
 * Clears user and token data (forces logout)
 * Useful when user data is corrupted
 */
export const clearUserData = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
    ]);
    console.log('User and token data cleared');
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
};
