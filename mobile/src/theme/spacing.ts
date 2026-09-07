import { radii } from './radii';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

/** Prefer `radii` for new code. Alias kept so feature screens keep compiling. */
export const spacingPatterns = {
  borderRadius: radii,
};
