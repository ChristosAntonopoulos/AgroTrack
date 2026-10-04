/** Lux thresholds for outdoor sun palette — hysteresis avoids flicker in shade. */
export const SUN_ENTER_LUX = 10_000;
export const SUN_LEAVE_LUX = 3_000;

/** Interval between ambient light samples (ms). */
export const SUN_SAMPLE_MS = 1_500;

/**
 * Whether ambient light counts as "sunny field" given the previous state.
 * Enter above SUN_ENTER_LUX; leave below SUN_LEAVE_LUX; otherwise hold.
 */
export function resolveSunnyFromLux(lux: number, wasSunny: boolean): boolean {
  if (lux >= SUN_ENTER_LUX) return true;
  if (lux <= SUN_LEAVE_LUX) return false;
  return wasSunny;
}
