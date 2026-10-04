import type { MapLayerType } from './mapLayers';

const BASE_KEY = (fieldId: string) => `oleachron.fieldMap.base.${fieldId}`;
const OVERLAY_KEY = (fieldId: string) => `oleachron.fieldMap.overlay.${fieldId}`;

const isMapLayerType = (value: string | null): value is MapLayerType =>
  value === 'satellite' || value === 'street';

/** Read a previously chosen base map; undefined means the user has not chosen yet. */
export const readPersistedBaseLayer = (fieldId: string): MapLayerType | undefined => {
  try {
    const raw = sessionStorage.getItem(BASE_KEY(fieldId));
    return isMapLayerType(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
};

export const persistBaseLayer = (fieldId: string, layer: MapLayerType): void => {
  try {
    sessionStorage.setItem(BASE_KEY(fieldId), layer);
  } catch {
    /* ignore quota / private mode */
  }
};

export const readPersistedOverlayIds = (fieldId: string): string[] | undefined => {
  try {
    const raw = sessionStorage.getItem(OVERLAY_KEY(fieldId));
    if (raw == null) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return undefined;
  }
};

export const persistOverlayIds = (fieldId: string, ids: string[]): void => {
  try {
    sessionStorage.setItem(OVERLAY_KEY(fieldId), JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};
