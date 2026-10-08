/** Aligned with backend PasswordPolicy: min 8 + upper + lower + digit. */

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordChecks = {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
};

export type PasswordIssue = 'tooShort' | 'complexity';

export const getPasswordChecks = (password: string): PasswordChecks => ({
  minLength: password.length >= MIN_PASSWORD_LENGTH,
  hasUpper: /[A-Z]/.test(password),
  hasLower: /[a-z]/.test(password),
  hasDigit: /[0-9]/.test(password),
});

/** 0–3 met requirements after length, used for the strength bar. */
export const getPasswordStrengthScore = (password: string): number => {
  const c = getPasswordChecks(password);
  if (!password) return 0;
  let score = 0;
  if (c.minLength) score += 1;
  if (c.hasUpper) score += 1;
  if (c.hasLower) score += 1;
  if (c.hasDigit) score += 1;
  return score;
};

export const isValidPassword = (password: string): boolean => {
  const c = getPasswordChecks(password);
  return c.minLength && c.hasUpper && c.hasLower && c.hasDigit;
};

export const getPasswordIssue = (password: string): PasswordIssue | null => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) return 'tooShort';
  if (!isValidPassword(password)) return 'complexity';
  return null;
};
