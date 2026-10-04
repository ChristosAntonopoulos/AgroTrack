/** Satellite overlays hide each other; the grower always looks at one picture. */
export const FULL_OVERLAY_CAP = 1;

export function nextOverlayIds(
  current: string[],
  layerId: string | undefined,
  cap = FULL_OVERLAY_CAP
): {
  ids: string[];
  blocked: boolean;
} {
  if (!layerId) {
    return { ids: [], blocked: false };
  }
  if (current.length === 1 && current[0] === layerId) {
    return { ids: current, blocked: false };
  }
  if (cap <= 0) {
    return { ids: [], blocked: false };
  }
  return { ids: [layerId], blocked: false };
}
