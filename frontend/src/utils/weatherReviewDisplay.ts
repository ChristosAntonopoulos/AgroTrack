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

const INSIGHT_KEYS: Record<string, string> = {
  frost: 'chronologio:weatherReview.insightFrost',
  heat: 'chronologio:weatherReview.insightHeat',
  heavyRain: 'chronologio:weatherReview.insightHeavyRain',
  dry: 'chronologio:weatherReview.insightDry',
  waterDeficit: 'chronologio:weatherReview.insightWaterDeficit',
  waterSurplus: 'chronologio:weatherReview.insightWaterSurplus',
  wetter: 'chronologio:weatherReview.insightWetter',
  drier: 'chronologio:weatherReview.insightDrier',
  greener: 'chronologio:weatherReview.insightGreener',
  browner: 'chronologio:weatherReview.insightBrowner',
  moistureUp: 'chronologio:weatherReview.insightMoistureUp',
  moistureDown: 'chronologio:weatherReview.insightMoistureDown',
};

export const insightLabel = (kind: string, t: TFunc): string =>
  t(INSIGHT_KEYS[kind] || 'chronologio:categoryLabel.weather');

const formatShortDay = (value?: string, locale?: string) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale || 'en', { day: 'numeric', month: 'short' });
};

/** Place a 0–1 greenness reading on the visible track (sparse → lush). */
export const greennessPercent = (ndvi?: number | null): number | null => {
  if (ndvi == null || !Number.isFinite(ndvi)) return null;
  return Math.round(Math.min(100, Math.max(0, ((ndvi - 0.15) / 0.8) * 100)));
};

export type TreeLookStory = {
  title: string;
  text: string;
  startLabel?: string;
  endLabel?: string;
  startPct?: number;
  endPct?: number;
};

/** Plain-language start→end tree look. Avoids NDVI and percent jargon. */
export const buildTreeLookStory = (
  weather: ChronologioWeatherDetails | null | undefined,
  locale: string,
  t: TFunc
): TreeLookStory | null => {
  if (!weather) return null;
  const opening = weather.openingScene;
  const closing = weather.closingScene;
  const startNdvi = opening?.ndviMean ?? null;
  const endNdvi = closing?.ndviMean ?? weather.ndviMean ?? null;
  if (startNdvi == null && endNdvi == null) return null;

  const startLabel = formatShortDay(opening?.observationDate, locale) ?? undefined;
  const endLabel = formatShortDay(closing?.observationDate, locale) ?? undefined;
  const startPct = greennessPercent(startNdvi) ?? undefined;
  const endPct = greennessPercent(endNdvi) ?? undefined;

  if (startNdvi != null && endNdvi != null && startLabel && endLabel && startLabel !== endLabel) {
    const delta = endNdvi - startNdvi;
    let text: string;
    if (Math.abs(delta) < 0.03) {
      text = t('chronologio:weatherReview.treesSame', { from: startLabel, to: endLabel });
    } else if (delta >= 0.12) {
      text = t('chronologio:weatherReview.treesMuchGreener', { from: startLabel, to: endLabel });
    } else if (delta > 0) {
      text = t('chronologio:weatherReview.treesABitGreener', { from: startLabel, to: endLabel });
    } else if (delta <= -0.12) {
      text = t('chronologio:weatherReview.treesMuchLessGreen', { from: startLabel, to: endLabel });
    } else {
      text = t('chronologio:weatherReview.treesABitLessGreen', { from: startLabel, to: endLabel });
    }
    return {
      title: t('chronologio:weatherReview.treesLook'),
      text,
      startLabel,
      endLabel,
      startPct,
      endPct,
    };
  }

  const only = endLabel || startLabel;
  return {
    title: t('chronologio:weatherReview.treesLook'),
    text: only
      ? t('chronologio:weatherReview.treesOnDate', { date: only })
      : t('chronologio:weatherReview.treesThisMonth'),
    startLabel,
    endLabel,
    startPct,
    endPct,
  };
};
