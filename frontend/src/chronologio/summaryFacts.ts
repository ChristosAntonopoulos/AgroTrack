import type {
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../services/chronologioService';
import { formatChronologioMoney } from '../utils/chronologioGrouping';
import { formatGroveMassKg, formatGroveMassKgLabel } from '../utils/groveTotals';

type TFn = (key: string, opts?: Record<string, string | number>) => string;

export const periodEventCount = (
  s: Pick<
    ChronologioPeriodSummary,
    'taskCount' | 'expenseCount' | 'harvestCount' | 'noteCount'
  >
): number => s.taskCount + s.expenseCount + s.harvestCount + s.noteCount;

/** Compact fact chips for month chapters (max 4). */
export const monthChapterFacts = (
  m: ChronologioMonthSummary,
  numberLocale: string,
  t: TFn
): string[] => {
  const facts: string[] = [];
  const events = periodEventCount(m);
  if (events > 0) {
    facts.push(
      events === 1 ? t('living.monthOneEvent') : t('living.monthWorks', { count: events })
    );
  }
  if (m.expenseTotal > 0) {
    facts.push(formatChronologioMoney(m.expenseTotal, m.currency, numberLocale));
  }
  if (m.oliveKg > 0) {
    facts.push(formatGroveMassKgLabel(m.oliveKg, numberLocale));
  }
  if (m.rainfallMm != null && m.rainfallMm > 0 && facts.length < 4) {
    facts.push(t('living.statRain', { mm: Math.round(m.rainfallMm) }));
  } else if (m.oilKg > 0 && facts.length < 4) {
    facts.push(`${formatGroveMassKgLabel(m.oilKg, numberLocale)} ${t('living.metricOil')}`);
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
  s: AgMetrics,
  numberLocale: string,
  t: TFn
): { label: string; value: string }[] => {
  const dash = '—';
  return [
    {
      label: t('living.metricTasks'),
      value:
        s.taskCount > 0
          ? String(s.taskCount)
          : t('living.noRecordedTasks', {
              defaultValue: 'No recorded tasks',
            }),
    },
    {
      label: t('living.metricExpenses'),
      value:
        s.expenseTotal > 0
          ? formatChronologioMoney(s.expenseTotal, s.currency, numberLocale)
          : dash,
    },
    {
      label: t('living.metricOlives'),
      value: s.oliveKg > 0 ? formatGroveMassKgLabel(s.oliveKg, numberLocale) : dash,
    },
    {
      label: t('living.metricOil'),
      value: s.oilKg > 0 ? formatGroveMassKgLabel(s.oilKg, numberLocale) : dash,
    },
    {
      label: t('living.metricYield'),
      value:
        s.oilYieldPercent != null && s.oilYieldPercent > 0
          ? `${formatGroveMassKg(s.oilYieldPercent, numberLocale)}%`
          : dash,
    },
  ];
};

/** Up to two weather aggregate facts for year covers / peek. */
export const weatherFactBits = (
  s: Pick<ChronologioPeriodSummary, 'rainfallMm' | 'heatDays' | 'frostNights'>,
  t: TFn
): string[] => {
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
