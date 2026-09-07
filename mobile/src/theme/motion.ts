/** Shared motion spec. UI transitions stay in the 150–250ms range. */
export const motion = {
  durationMs: {
    fast: 150,
    ui: 200,
    slow: 250,
  },
  pressOpacity: 0.75,
} as const;

export type Motion = typeof motion;
