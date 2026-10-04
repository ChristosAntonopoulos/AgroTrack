/** Extreme weather Chronologio event types written by WeatherExtremeEventScanner. */
export const WEATHER_EXTREME_EVENT_TYPES = [
  'weather.heat',
  'weather.frost',
  'weather.nearFrost',
  'weather.heavyRain',
  'weather.drought',
  'weather.coldSpell',
] as const;

export type WeatherExtremeEventType = (typeof WEATHER_EXTREME_EVENT_TYPES)[number];

/** Visual tone used for banner accent / fill. */
export type ExtremeVisualTone = 'heat' | 'frost' | 'rain' | 'drought' | 'cold';

export const isWeatherExtremeEventType = (eventType: string | undefined | null): boolean =>
  Boolean(eventType && (WEATHER_EXTREME_EVENT_TYPES as readonly string[]).includes(eventType));

export const extremeKindFromEventType = (eventType?: string | null): string | null => {
  switch (eventType) {
    case 'weather.heat':
      return 'heatwave';
    case 'weather.frost':
      return 'frost';
    case 'weather.nearFrost':
      return 'nearFrost';
    case 'weather.heavyRain':
      return 'heavyRain';
    case 'weather.drought':
      return 'drought';
    case 'weather.coldSpell':
      return 'coldSpell';
    default:
      return null;
  }
};

export const extremeVisualTone = (extremeKind?: string | null): ExtremeVisualTone => {
  switch (extremeKind) {
    case 'frost':
    case 'nearFrost':
      return 'frost';
    case 'coldSpell':
      return 'cold';
    case 'heatwave':
      return 'heat';
    case 'heavyRain':
      return 'rain';
    case 'drought':
      return 'drought';
    default:
      return 'heat';
  }
};

/** @deprecated Prefer extremeVisualTone — kept for older chip class names. */
export const extremeChipClass = (extremeKind?: string | null): string => {
  switch (extremeVisualTone(extremeKind)) {
    case 'frost':
    case 'cold':
      return 'is-frost';
    case 'heat':
      return 'is-heat';
    case 'rain':
      return 'is-heavyRain';
    case 'drought':
      return 'is-dry';
    default:
      return 'is-heat';
  }
};

export const formatExtremeDateRange = (
  startIso?: string | null,
  endIso?: string | null,
  locale = 'el'
): string | null => {
  if (!startIso && !endIso) return null;
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };
  if (startIso && endIso && startIso !== endIso) {
    return `${fmt(startIso)} – ${fmt(endIso)}`;
  }
  return fmt(endIso || startIso!);
};

export type ExtremeMetricBits = {
  streakDays?: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  rainfallMm?: number | null;
};

/** One short metric line for the banner (temps / rain — streak is labeled separately). */
export const extremeMetricLine = (
  weather: ExtremeMetricBits | null | undefined,
  numberLocale: string,
  kind?: string | null
): string | null => {
  if (!weather) return null;
  const tone = extremeVisualTone(kind);
  const parts: string[] = [];

  if (tone === 'rain' && weather.rainfallMm != null) {
    parts.push(
      `${weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`
    );
  } else if (tone === 'drought' && weather.rainfallMm != null) {
    parts.push(
      `${weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} mm`
    );
  } else if (
    (tone === 'heat' || tone === 'frost' || tone === 'cold') &&
    (weather.temperatureMin != null || weather.temperatureMax != null)
  ) {
    if (weather.temperatureMin != null && weather.temperatureMax != null) {
      parts.push(
        `${weather.temperatureMin.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}°–${weather.temperatureMax.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}°`
      );
    } else if (weather.temperatureMin != null) {
      parts.push(
        `${weather.temperatureMin.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}°`
      );
    } else if (weather.temperatureMax != null) {
      parts.push(
        `${weather.temperatureMax.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}°`
      );
    }
  } else if (weather.rainfallMm != null) {
    parts.push(
      `${weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`
    );
  }

  return parts.length > 0 ? parts.join(' · ') : null;
};
