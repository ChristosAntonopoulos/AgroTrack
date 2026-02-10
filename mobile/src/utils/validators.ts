/**
 * Validate email address
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate required field
 */
export const isRequired = (value: string | number | undefined | null): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== undefined && value !== null;
};

/**
 * Validate minimum length
 */
export const minLength = (value: string, min: number): boolean => {
  return value.length >= min;
};

/**
 * Validate maximum length
 */
export const maxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};

/**
 * Validate number range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate positive number
 */
export const isPositive = (value: number): boolean => {
  return value > 0;
};

/**
 * Validate non-negative number
 */
export const isNonNegative = (value: number): boolean => {
  return value >= 0;
};

/**
 * Validate date is in the future
 */
export const isFutureDate = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    return date > new Date();
  } catch (error) {
    return false;
  }
};

/**
 * Validate date is in the past
 */
export const isPastDate = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    return date < new Date();
  } catch (error) {
    return false;
  }
};

/**
 * Validate date range (start date before end date)
 */
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  } catch (error) {
    return false;
  }
};

/**
 * Generic form validator
 */
export interface ValidationRule {
  validator: (value: any) => boolean;
  message: string;
}

export const validateField = (
  value: any,
  rules: ValidationRule[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validator(value)) {
      errors.push(rule.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
