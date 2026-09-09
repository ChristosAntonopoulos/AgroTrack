/** Shared field accent palette — keep in sync with web + FieldService.DefaultFieldColors. */
export const FIELD_COLOR_PRESETS = [
  '#2F6B4F',
  '#3D6EA8',
  '#C47A1A',
  '#8B5E3C',
  '#5B7C99',
  '#6B8F3A',
  '#A65D4E',
  '#5C6B8A',
] as const;

const HEX = /^#[0-9A-Fa-f]{6}$/;

export const isFieldColor = (value: string | null | undefined): value is string =>
  Boolean(value && HEX.test(value.trim()));

export const resolveFieldColor = (
  color?: string | null,
  fieldId?: string | null
): string => {
  if (isFieldColor(color)) return color.trim().toUpperCase();
  const seed = fieldId || 'field';
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % FIELD_COLOR_PRESETS.length;
  return FIELD_COLOR_PRESETS[index];
};

export type WeatherMood = 'wet' | 'dry' | 'heat' | 'frost' | 'mild';

type WeatherMoodInput = {
  rainfallMm?: number;
  frostNights?: number;
  heatDays?: number;
  heavyRainDays?: number;
  longestDryStreakDays?: number;
  rainVsPreviousPercent?: number;
};

export const resolveWeatherMood = (weather?: WeatherMoodInput | null): WeatherMood => {
  if (!weather) return 'mild';
  if ((weather.frostNights ?? 0) > 0) return 'frost';
  if ((weather.heatDays ?? 0) > 0) return 'heat';
  if ((weather.heavyRainDays ?? 0) > 0 || (weather.rainVsPreviousPercent ?? 0) >= 15) {
    return 'wet';
  }
  if ((weather.longestDryStreakDays ?? 0) >= 10 || (weather.rainVsPreviousPercent ?? 0) <= -15) {
    return 'dry';
  }
  if ((weather.rainfallMm ?? 0) >= 80) return 'wet';
  if ((weather.rainfallMm ?? 0) > 0 && (weather.rainfallMm ?? 0) < 15) return 'dry';
  return 'mild';
};

export const WEATHER_MOOD_COLORS: Record<WeatherMood, string> = {
  wet: '#2D6A9F',
  dry: '#C27803',
  heat: '#C45C26',
  frost: '#5B8FC7',
  mild: '#5C6B8A',
};
