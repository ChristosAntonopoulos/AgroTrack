import type {
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../services/chronologioService';
import { formatChronologioMoney } from './chronologioGrouping';

type TFn = (key: string, opts?: Record<string, string | number>) => string;

export const periodEventCount = (
  s?: Pick<
    ChronologioPeriodSummary,
    'taskCount' | 'expenseCount' | 'harvestCount' | 'noteCount'
  > | null
): number =>
  (s?.taskCount || 0) + (s?.expenseCount || 0) + (s?.harvestCount || 0) + (s?.noteCount || 0);

/** Compact fact chips for month chapters (max 4). */
export const monthChapterFacts = (
  m: ChronologioMonthSummary | null | undefined,
  numberLocale: string,
  t: TFn
): string[] => {
  if (!m) return [];
  const facts: string[] = [];
  const events = periodEventCount(m);
  if (events > 0) {
    facts.push(
      events === 1 ? t('living.monthOneEvent') : t('living.monthWorks', { count: events })
    );
  }
  if ((m.expenseTotal || 0) > 0) {
    facts.push(formatChronologioMoney(m.expenseTotal, m.currency || 'EUR', numberLocale));
  }
  if ((m.oliveKg || 0) > 0) {
    facts.push(`${Math.round(m.oliveKg).toLocaleString(numberLocale)} kg`);
  }
  if (m.rainfallMm != null && m.rainfallMm > 0 && facts.length < 4) {
    facts.push(t('living.statRain', { mm: Math.round(m.rainfallMm) }));
  } else if ((m.oilKg || 0) > 0 && facts.length < 4) {
    facts.push(`${Math.round(m.oilKg).toLocaleString(numberLocale)} kg ${t('living.metricOil')}`);
  }
  return facts.slice(0, 4);
};

type AgMetrics = {
  taskCount: number;
  expenseTotal: number;
  currency: string;
  oliveKg: number;
  oilKg: number;
  oilYieldPercent?: number | null;
};

/** Always five agricultural slots; missing values render as em dash. */
export const yearFixedMetrics = (
  s: AgMetrics | null | undefined,
  numberLocale: string,
  t: TFn
): { label: string; value: string }[] => {
  const dash = '—';
  if (!s) {
    return [
      { label: t('living.metricTasks'), value: dash },
      { label: t('living.metricExpenses'), value: dash },
      { label: t('living.metricOlives'), value: dash },
      { label: t('living.metricOil'), value: dash },
      { label: t('living.metricYield'), value: dash },
    ];
  }
  return [
    {
      label: t('living.metricTasks'),
      value: (s.taskCount || 0) > 0 ? String(s.taskCount) : dash,
    },
    {
      label: t('living.metricExpenses'),
      value:
        (s.expenseTotal || 0) > 0
          ? formatChronologioMoney(s.expenseTotal, s.currency || 'EUR', numberLocale)
          : dash,
    },
    {
      label: t('living.metricOlives'),
      value:
        (s.oliveKg || 0) > 0 ? `${Math.round(s.oliveKg).toLocaleString(numberLocale)} kg` : dash,
    },
    {
      label: t('living.metricOil'),
      value: (s.oilKg || 0) > 0 ? `${Math.round(s.oilKg).toLocaleString(numberLocale)} kg` : dash,
    },
    {
      label: t('living.metricYield'),
      value:
        s.oilYieldPercent != null && s.oilYieldPercent > 0
          ? `${s.oilYieldPercent}%`
          : dash,
    },
  ];
};

/** Up to two weather aggregate facts for year covers / peek. */
export const weatherFactBits = (
  s: Pick<ChronologioPeriodSummary, 'rainfallMm' | 'heatDays' | 'frostNights'> | null | undefined,
  t: TFn
): string[] => {
  if (!s) return [];
  const bits: string[] = [];
  if (s.rainfallMm != null && s.rainfallMm > 0) {
    bits.push(t('living.statRain', { mm: Math.round(s.rainfallMm) }));
  }
  if (s.heatDays != null && s.heatDays > 0) {
    bits.push(t('living.statHeatDays', { count: s.heatDays }));
  } else if (s.frostNights != null && s.frostNights > 0) {
    bits.push(t('living.statFrostNights', { count: s.frostNights }));
  }
  return bits.slice(0, 2);
};

export const majorMonthsForYear = (
  months: ChronologioMonthSummary[],
  limit = 4
): ChronologioMonthSummary[] =>
  [...months]
    .filter((m) => periodEventCount(m) > 0)
    .sort((a, b) => {
      const score = (m: ChronologioMonthSummary) =>
        m.harvestCount * 1000 + m.oliveKg + periodEventCount(m);
      return score(b) - score(a);
    })
    .slice(0, limit);
