/** Touch targets — Android 48dp / Apple 44pt; we use 48. */
export const touch = {
  min: 48,
  fab: 56,
  icon: 44,
} as const;

export type Touch = typeof touch;
