/**
 * Data Sanitization Utility
 * 
 * Sanitizes data loaded from AsyncStorage to ensure boolean values are strict booleans,
 * not strings. This prevents "java.lang.String cannot be cast to java.lang.Boolean" errors.
 */

import { toBoolean } from './booleanConverter';

/**
 * Recursively sanitizes an object, converting string booleans to actual booleans
 * @param obj - The object to sanitize
 * @param booleanFields - Optional array of field names that should be converted to booleans
 * @returns Sanitized object with strict boolean values
 */
export const sanitizeObject = <T>(obj: any, booleanFields?: string[]): T => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, booleanFields)) as T;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle objects
  const sanitized: any = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // If this field is in the booleanFields list, or if it's a string boolean, convert it
      if (booleanFields?.includes(key) || (typeof value === 'string' && (value === 'true' || value === 'false'))) {
        sanitized[key] = toBoolean(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects and arrays
        sanitized[key] = sanitizeObject(value, booleanFields);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized as T;
};

/**
 * Sanitizes a Task object, ensuring all boolean-like fields are strict booleans
 * Note: Task.status is a string, not a boolean, so we don't convert it
 */
export const sanitizeTask = <T extends { [key: string]: any }>(task: T): T => {
  return sanitizeObject(task);
};

/**
 * Sanitizes an array of Task objects
 */
export const sanitizeTasks = <T extends { [key: string]: any }>(tasks: T[]): T[] => {
  return tasks.map(task => sanitizeTask(task));
};

/**
 * Sanitizes a Field object, ensuring irrigationStatus is a strict boolean
 */
export const sanitizeField = <T extends { irrigationStatus?: any; [key: string]: any }>(field: T): T => {
  const sanitized = { ...field };
  
  // Ensure irrigationStatus is always a strict boolean
  if ('irrigationStatus' in sanitized) {
    sanitized.irrigationStatus = toBoolean(sanitized.irrigationStatus);
  }
  
  return sanitized as T;
};

/**
 * Sanitizes an array of Field objects
 */
export const sanitizeFields = <T extends { irrigationStatus?: any; [key: string]: any }>(fields: T[]): T[] => {
  return fields.map(field => sanitizeField(field));
};

export default sanitizeObject;
