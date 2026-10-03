/** Shared field accent palette — keep in sync with web + FieldService.DefaultFieldColors. */
export const FIELD_COLOR_PRESETS = [
  '#E8C547',
  '#B54422',
  '#F0D48A',
  '#6F3D1E',
  '#E08A1F',
  '#C45C48',
  '#C9A07A',
  '#8B5A32',
] as const;

export const DEFAULT_FIELD_COLOR = FIELD_COLOR_PRESETS[0];

const LEGACY_FIELD_COLOR_MAP: Record<string, string> = {
  '#2F6B4F': '#E8C547',
  '#C9A227': '#E8C547',
  '#D4A84A': '#E8C547',
  '#3D6EA8': '#B54422',
  '#C17A3A': '#B54422',
  '#5B7C99': '#F0D48A',
  '#E0B85C': '#F0D48A',
  '#B89A4A': '#F0D48A',
  '#6B3D22': '#6F3D1E',
  '#5C3A28': '#6F3D1E',
  '#5C6B8A': '#6F3D1E',
  '#6B8F3A': '#E08A1F',
  '#D08928': '#E08A1F',
  '#C47A1A': '#E08A1F',
  '#A65D4E': '#C45C48',
  '#A85C2A': '#C45C48',
  '#C45C32': '#C45C48',
  '#8B5E3C': '#C9A07A',
  '#A86B42': '#C9A07A',
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

export const isFieldColor = (value: string | null | undefined): value is string =>
  Boolean(value && HEX.test(value.trim()));

const normalizeHex = (value: string): string => {
  const hex = value.trim().toUpperCase();
  return LEGACY_FIELD_COLOR_MAP[hex] ?? hex;
};

const colorFromSeed = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return FIELD_COLOR_PRESETS[Math.abs(hash) % FIELD_COLOR_PRESETS.length];
};

export const resolveFieldColor = (
  color?: string | null,
  fieldId?: string | null
): string => {
  if (isFieldColor(color)) return normalizeHex(color);
  return colorFromSeed(fieldId || 'field');
};

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

const linearChannel = (channel: number) => {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
};

/**
 * Grove swatches are often pale yellow. On ivory they disappear as text and
 * look like a highlighter as a bar. Pull light colours toward umber until the
 * stripe still reads as that grove, but holds contrast.
 */
export const readableFieldColor = (color: string): string => {
  if (!isFieldColor(color)) return color;
  let next = normalizeHex(color);
  const ink = hexToRgb('#3A2914');
  for (let i = 0; i < 8 && luminance(next) > 0.18; i += 1) {
    const current = hexToRgb(next);
    next = rgbToHex(
      current.r + (ink.r - current.r) * 0.38,
      current.g + (ink.g - current.g) * 0.38,
      current.b + (ink.b - current.b) * 0.38
    );
  }
  return next;
};

const colourDistance = (a: string, b: string) => {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  return Math.abs(left.r - right.r) + Math.abs(left.g - right.g) + Math.abs(left.b - right.b);
};

const farthestUnused = (used: Set<string>): string | undefined => {
  const unused = FIELD_COLOR_PRESETS.filter((preset) => !used.has(preset));
  if (unused.length === 0) return undefined;
  let best = unused[0];
  let bestScore = -1;
  for (const candidate of unused) {
    const score = Math.min(...[...used].map((taken) => colourDistance(candidate, taken)));
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
};

export const distinctFieldColors = (
  fields: Array<{ id: string; color?: string | null }>
): Record<string, string> => {
  const sorted = [...fields].sort((a, b) => a.id.localeCompare(b.id));
  const used = new Set<string>();
  const out: Record<string, string> = {};
  for (const field of sorted) {
    let color = resolveFieldColor(field.color, field.id);
    if (used.has(color)) {
      const next = farthestUnused(used);
      if (next) color = next;
    }
    used.add(color);
    out[field.id] = color;
  }
  return out;
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

/** Aligned with web weather tokens (--rain, --temperature, --frost, --weather-blue) */
export const WEATHER_MOOD_COLORS: Record<WeatherMood, string> = {
  wet: '#588EA5',
  dry: '#CB8B55',
  heat: '#C96656',
  frost: '#8CA9BF',
  mild: '#70A9BA',
};
