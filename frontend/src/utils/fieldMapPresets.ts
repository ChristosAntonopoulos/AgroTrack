export const FULL_OVERLAY_CAP = 3;

export function nextOverlayIds(current: string[], layerId: string, cap = FULL_OVERLAY_CAP): {
  ids: string[];
  blocked: boolean;
} {
  if (current.includes(layerId)) {
    return { ids: current.filter((id) => id !== layerId), blocked: false };
  }
  if (current.length >= cap) {
    return { ids: current, blocked: true };
  }
  return { ids: [...current, layerId], blocked: false };
}
