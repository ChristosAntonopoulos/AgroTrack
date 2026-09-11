export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  /** Phone bottom-sheet top corners (web RightDrawer mobile) */
  sheet: 22,
  full: 9999,
} as const;

export type Radius = keyof typeof radii;
