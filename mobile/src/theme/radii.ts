export const radii = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  /** Phone bottom-sheet top corners */
  sheet: 28,
  control: 14,
  card: 18,
  dock: 22,
  full: 9999,
} as const;

export type Radius = keyof typeof radii;
