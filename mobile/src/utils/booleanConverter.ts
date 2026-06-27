/**
 * Simple boolean converter utility
 * Always returns a strict boolean (true or false), never a string or other type
 * This ensures native components always receive proper boolean values
 */

/**
 * Converts any value to a strict boolean
 * Handles: strings ("true"/"false"), numbers (0/1), null, undefined, objects, etc.
 * Always returns true or false (never string, number, or other types)
 */
export const toBoolean = (value: any, context?: string): boolean => {
  const originalType = typeof value;
  const originalValue = value;
  
  // Fast path: already a boolean - ensure it's a strict boolean type
  if (typeof value === 'boolean') {
    return value as boolean;
  }
  
  // Fast path: null or undefined
  if (value === null || value === undefined) {
    return false as boolean;
  }
  
  // Handle strings - this is the most common source of boolean casting errors
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    
    // Log conversion for debugging (only in dev mode and if context provided)
    if (__DEV__ && context && (trimmed === 'true' || trimmed === 'false')) {
      console.log(`[toBoolean] Converting string "${value}" to boolean in ${context}`);
    }
    
    // Empty string is false
    if (trimmed === '') {
      return false as boolean;
    }
    // Common truthy strings
    if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes' || trimmed === 'on') {
      return true as boolean;
    }
    // Common falsy strings
    if (trimmed === 'false' || trimmed === '0' || trimmed === 'no' || trimmed === 'off') {
      return false as boolean;
    }
    // Any non-empty string is truthy
    return true as boolean;
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    return (value !== 0 && !isNaN(value)) as boolean;
  }
  
  // Handle objects and arrays
  if (typeof value === 'object') {
    // Array: true if has length > 0
    if (Array.isArray(value)) {
      return (value.length > 0) as boolean;
    }
    // Object: true if not null
    return (value !== null) as boolean;
  }
  
  // Warn about unexpected types in dev mode
  if (__DEV__ && context && originalType !== 'boolean') {
    console.warn(`[toBoolean] Unexpected type "${originalType}" (value: ${originalValue}) in ${context}, converting to boolean`);
  }
  
  // Default: convert to boolean using standard JavaScript coercion
  // Use !! to ensure strict boolean, then cast to satisfy TypeScript
  return !!value as boolean;
};

/**
 * Alias for toBoolean - shorter name for convenience
 */
export const bool = toBoolean;

/**
 * Converts value to boolean, with a default fallback
 * Useful for expressions like: toBooleanOr(value, defaultValue)
 */
export const toBooleanOr = (value: any, defaultValue: boolean = false): boolean => {
  if (value === undefined || value === null) {
    return defaultValue as boolean;
  }
  return toBoolean(value);
};

/**
 * Converts value to boolean and negates it
 * Useful for patterns like: editable={toBooleanNot(loading)}
 */
export const toBooleanNot = (value: any): boolean => {
  return !toBoolean(value) as boolean;
};

/** Boolean props accepted by React Native TextInput on the native bridge */
export const TEXT_INPUT_BOOLEAN_KEYS = [
  'allowFontScaling',
  'autoCorrect',
  'autoFocus',
  'blurOnSubmit',
  'caretHidden',
  'contextMenuHidden',
  'editable',
  'enablesReturnKeyAutomatically',
  'focusable',
  'multiline',
  'readOnly',
  'rejectResponderTermination',
  'scrollEnabled',
  'secureTextEntry',
  'selectTextOnFocus',
  'showSoftInputOnFocus',
  'spellCheck',
] as const;

/**
 * Coerce known native boolean props so Android never receives string "true"/"false".
 */
export const sanitizeNativeBooleans = <T extends Record<string, unknown>>(
  props: T,
  keys: readonly string[] = TEXT_INPUT_BOOLEAN_KEYS
): T => {
  const result = { ...props };
  for (const key of keys) {
    if (key in result && result[key] !== undefined) {
      (result as Record<string, unknown>)[key] = toBoolean(result[key], key);
    }
  }
  return result;
};

export default toBoolean;
