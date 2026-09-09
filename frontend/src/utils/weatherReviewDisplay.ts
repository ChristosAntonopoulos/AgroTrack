import type { ChronologioWeatherDetails } from '../services/chronologioService';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

export type WeatherAdverseKind = 'frost' | 'heat' | 'heavyRain' | 'dry';

export type WeatherAdverseChip = {
  kind: WeatherAdverseKind;
  label: string;
};

export type RainVsPreviousInsight = {
  text: string;
  tone: 'wetter' | 'drier';
};

/** Adverse conditions for Chronologio weather reviews — only non-zero items. */
export const buildWeatherAdverseChips = (
  weather: ChronologioWeatherDetails | undefined,
  eventType: string,
  t: TFunc
): WeatherAdverseChip[] => {
  if (!weather) return [];
  const chips: WeatherAdverseChip[] = [];

  if (eventType === 'weather.monthReview' && (weather.frostNights ?? 0) > 0) {
    chips.push({
      kind: 'frost',
      label: t('chronologio:weatherReview.adverseFrost', { count: weather.frostNights }),
    });
  }
  if ((weather.heatDays ?? 0) > 0) {
    chips.push({
      kind: 'heat',
      label: t('chronologio:weatherReview.adverseHeat', { count: weather.heatDays }),
    });
  }
  if ((weather.heavyRainDays ?? 0) > 0) {
    chips.push({
      kind: 'heavyRain',
      label: t('chronologio:weatherReview.adverseHeavyRain', { count: weather.heavyRainDays }),
    });
  }
  if ((weather.longestDryStreakDays ?? 0) >= 10) {
    chips.push({
      kind: 'dry',
      label: t('chronologio:weatherReview.adverseDryStreak', {
        count: weather.longestDryStreakDays,
      }),
    });
  }
  return chips;
};

/** @deprecated Prefer buildWeatherAdverseChips for UI. */
export const buildWeatherAdverseParts = (
  weather: ChronologioWeatherDetails | undefined,
  eventType: string,
  t: TFunc
): string[] => buildWeatherAdverseChips(weather, eventType, t).map((c) => c.label);

export const getRainVsPrevious = (
  weather: ChronologioWeatherDetails | undefined,
  eventType: string,
  t: TFunc
): RainVsPreviousInsight | null => {
  const pct = weather?.rainVsPreviousPercent;
  if (pct == null || Math.abs(pct) < 15) return null;
  const tone: 'wetter' | 'drier' = pct > 0 ? 'wetter' : 'drier';
  const key =
    eventType === 'weather.yearReview'
      ? tone === 'wetter'
        ? 'chronologio:weatherReview.rainWetterYear'
        : 'chronologio:weatherReview.rainDrierYear'
      : tone === 'wetter'
        ? 'chronologio:weatherReview.rainWetterMonth'
        : 'chronologio:weatherReview.rainDrierMonth';
  return {
    tone,
    text: t(key, { pct: Math.abs(Math.round(pct)) }),
  };
};

export const formatRainVsPrevious = (
  weather: ChronologioWeatherDetails | undefined,
  eventType: string,
  t: TFunc
): string | null => getRainVsPrevious(weather, eventType, t)?.text ?? null;

export const formatVegetationNote = (
  weather: ChronologioWeatherDetails | undefined,
  eventType: string,
  t: TFunc
): string | null => {
  const delta = weather?.ndviDeltaPercent;
  if (delta == null || Math.abs(delta) < 5) {
    return weather?.vegetationNote || null;
  }
  if (eventType === 'weather.yearReview') {
    return delta > 0
      ? t('chronologio:weatherReview.vegGreenerYear')
      : t('chronologio:weatherReview.vegLessGreenYear');
  }
  return delta > 0
    ? t('chronologio:weatherReview.vegGreenerMonth')
    : t('chronologio:weatherReview.vegLessGreenMonth');
};

export const formatWettestMonth = (
  weather: ChronologioWeatherDetails | undefined,
  locale: string,
  t: TFunc
): string | null => {
  const month = weather?.wettestMonth;
  if (!month || month < 1 || month > 12) return null;
  const name = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2020, month - 1, 1))
  );
  return t('chronologio:weatherReview.wettestMonth', { month: name });
};
