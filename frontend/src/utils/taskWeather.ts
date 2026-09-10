export type WeatherDisplayKind = 'good' | 'caution' | 'unsuitable' | 'unknown' | 'not_sensitive';

const GOOD = new Set(['good', 'suitable']);
const CAUTION = new Set(['caution', 'watch']);
const UNSUITABLE = new Set(['unsuitable', 'bad', 'poor']);
const NOT_SENSITIVE = new Set(['not_sensitive', 'not-sensitive', 'unaffected']);

export const resolveWeatherKind = (suitability?: string | null): WeatherDisplayKind => {
  const value = String(suitability || '').trim().toLowerCase();
  if (!value || value === 'unknown' || value === 'missing') return 'unknown';
  if (GOOD.has(value)) return 'good';
  if (CAUTION.has(value)) return 'caution';
  if (UNSUITABLE.has(value)) return 'unsuitable';
  if (NOT_SENSITIVE.has(value)) return 'not_sensitive';
  return 'unknown';
};

/** Missing weather must never be presented as a suitable day. */
export const weatherDisplayLabel = (
  suitability: string | null | undefined,
  providedLabel: string | null | undefined,
  fallbackUnknown: string
): string => {
  const kind = resolveWeatherKind(suitability);
  if (kind === 'unknown') return fallbackUnknown;
  return providedLabel?.trim() || fallbackUnknown;
};
