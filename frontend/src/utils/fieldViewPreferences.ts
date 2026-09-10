/** UI-only Field page preferences. Not business data. */
const STORAGE_KEY = 'oleachron.fieldView';


export type FieldViewTab = 'overview' | 'map' | 'chronologio' | 'details';

export type FieldViewPreferences = {
  lastTab?: FieldViewTab;
  lastPreset?: 'field' | 'water' | 'frost' | 'vegetation';
  lastBase?: 'satellite' | 'street' | 'terrain';
  lastOverlays?: string[];
};

const isTab = (value: unknown): value is FieldViewTab =>
  value === 'overview' || value === 'map' || value === 'chronologio' || value === 'details';

export const readFieldViewPreferences = (): FieldViewPreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FieldViewPreferences;
    return {
      lastTab: isTab(parsed.lastTab) ? parsed.lastTab : undefined,
      lastPreset:
        parsed.lastPreset === 'field' ||
        parsed.lastPreset === 'water' ||
        parsed.lastPreset === 'frost' ||
        parsed.lastPreset === 'vegetation'
          ? parsed.lastPreset
          : undefined,
      lastBase:
        parsed.lastBase === 'satellite' || parsed.lastBase === 'street' || parsed.lastBase === 'terrain'
          ? parsed.lastBase
          : undefined,
      lastOverlays: Array.isArray(parsed.lastOverlays)
        ? parsed.lastOverlays.filter((id): id is string => typeof id === 'string').slice(0, 3)
        : undefined,
    };
  } catch {
    return {};
  }
};

export const writeFieldViewPreferences = (patch: Partial<FieldViewPreferences>): void => {
  const next = { ...readFieldViewPreferences(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
