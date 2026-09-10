export type SimpleMapPreset = 'field' | 'water' | 'frost' | 'vegetation';

export const FULL_OVERLAY_CAP = 3;

export const SIMPLE_PRESET_LAYER: Record<SimpleMapPreset, string | undefined> = {
  field: undefined,
  water: 'ndmi',
  frost: undefined,
  vegetation: 'ndvi',
};

export const WATER_FALLBACK_LAYER = 'ndwi';

export function resolveSimplePresetLayer(
  preset: SimpleMapPreset,
  availableIds: string[]
): { layerId?: string; missingKey?: string } {
  if (preset === 'field' || preset === 'frost') {
    return {};
  }
  if (preset === 'water') {
    if (availableIds.includes('ndmi')) return { layerId: 'ndmi' };
    if (availableIds.includes('ndwi')) return { layerId: WATER_FALLBACK_LAYER };
    return { missingKey: 'mapWorkspace.missingMoisture' };
  }
  if (availableIds.includes('ndvi')) return { layerId: 'ndvi' };
  return { missingKey: 'mapWorkspace.missingVegetation' };
}

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
