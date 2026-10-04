/** Shared motion — spatial continuity, not decoration. */
export const motion = {
  durationMs: {
    fast: 140,
    ui: 200,
    standard: 200,
    sheet: 300,
    slow: 280,
  },
  pressOpacity: 0.88,
  pressScale: 0.985,
  fabPressScale: 0.96,
} as const;

export type Motion = typeof motion;
