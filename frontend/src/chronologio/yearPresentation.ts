import type {
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../services/chronologioService';
import { agriculturalYearFor, agriculturalYearMonths } from './agriculturalYear';
import { emptyPeriodSummary } from './livingTypes';
import { harvestHasResult, isMeaningfulHighlight, percentChange } from './monthPresentation';
import { periodEventCount } from './summaryFacts';
import { athensParts } from '../utils/athensDate';

export type AgriculturalYearState =
  | 'upcoming'
  | 'inProgress'
  | 'harvesting'
  | 'awaitingClosure'
  | 'closed';

export type SeasonStage = 'afterHarvest' | 'spring' | 'summer' | 'harvest';

export const SEASON_STAGES: SeasonStage[] = ['afterHarvest', 'spring', 'summer', 'harvest'];

export const agriculturalYearState = (
  periodYear: number,
  summary: Pick<ChronologioPeriodSummary, 'harvestCount' | 'oliveKg' | 'oilKg'>,
  now = new Date()
): AgriculturalYearState => {
  const current = agriculturalYearFor(now);
  const harvestStarted = summary.harvestCount > 0 || harvestHasResult(summary);
  if (periodYear > current) return 'upcoming';
  if (periodYear === current) return harvestStarted ? 'harvesting' : 'inProgress';
  if (harvestStarted && !harvestHasResult(summary)) return 'awaitingClosure';
  return 'closed';
};

export const isFinishedHistoricalYear = (state: AgriculturalYearState): boolean =>
  state === 'closed' || state === 'awaitingClosure';

/** Position in the agricultural year, not a completion percentage. */
export const seasonStageIndex = (now = new Date()): number => {
  const month = athensParts(now).month;
  if (month >= 2 && month <= 3) return 0;
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  return 3;
};

export const nextSeasonStageIndex = (index: number): number => Math.min(SEASON_STAGES.length - 1, index + 1);

/** How far along the agricultural year the bar should fill. Not a work-completion percent. */
export const seasonTrackFill = (stageIndex: number, complete = false): number =>
  complete ? 1 : Math.min(0.97, (Math.max(0, stageIndex) + 0.55) / SEASON_STAGES.length);

export const monthSeasonStage = (month: number): SeasonStage => {
  if (month >= 2 && month <= 3) return 'afterHarvest';
  if (month >= 4 && month <= 6) return 'spring';
  if (month >= 7 && month <= 9) return 'summer';
  return 'harvest';
};

export const harvestYearCopyKey = (
  summary: Pick<ChronologioPeriodSummary, 'harvestCount' | 'oliveKg' | 'oilKg'>
): 'result' | 'noResult' | 'notStarted' => {
  if (harvestHasResult(summary)) return 'result';
  if (summary.harvestCount > 0) return 'noResult';
  return 'notStarted';
};

export const yearHeadline = (summary: ChronologioPeriodSummary): string | undefined => {
  const highlight = (summary.highlightTitles || []).find(isMeaningfulHighlight);
  if (highlight) return highlight;
  return isMeaningfulHighlight(summary.observationHighlight)
    ? summary.observationHighlight
    : undefined;
};

export type YearComparisonKind = 'oil' | 'olives' | 'expenses' | 'yield';

/** `full` = closed years; `ytd` = same calendar span through today. */
export type YearComparisonScope = 'full' | 'ytd';

export type YearComparison = {
  kind: YearComparisonKind;
  percent: number;
  previousYear: number;
  scope: YearComparisonScope;
};

type ComparableYear = Pick<
  ChronologioPeriodSummary,
  'periodYear' | 'oliveKg' | 'oilKg' | 'expenseTotal' | 'oilYieldPercent'
>;

export type YearComparisonOptions = {
  /** Month rows for the newer (current) year — used to align YTD when needed. */
  currentMonths?: ChronologioMonthSummary[];
  /** Month rows for the older year — required for fair YTD vs a live year. */
  previousMonths?: ChronologioMonthSummary[];
  now?: Date;
};

const monthOrdinal = (year: number, month: number) => year * 12 + month;

/** Inclusive filter through a calendar year-month (Athens business calendar). */
export const monthsThroughInclusive = (
  months: ChronologioMonthSummary[],
  throughYear: number,
  throughMonth: number
): ChronologioMonthSummary[] => {
  const limit = monthOrdinal(throughYear, throughMonth);
  return months.filter((m) => monthOrdinal(m.year, m.month) <= limit);
};

export const sumMonthComparable = (
  months: ChronologioMonthSummary[]
): Pick<ChronologioPeriodSummary, 'oliveKg' | 'oilKg' | 'expenseTotal'> =>
  months.reduce(
    (acc, m) => ({
      oliveKg: acc.oliveKg + (m.oliveKg || 0),
      oilKg: acc.oilKg + (m.oilKg || 0),
      expenseTotal: acc.expenseTotal + (m.expenseTotal || 0),
    }),
    { oliveKg: 0, oilKg: 0, expenseTotal: 0 }
  );

const yieldFromMass = (row: ComparableYear): number | null => {
  if (row.oliveKg > 0 && row.oilKg > 0) return (row.oilKg / row.oliveKg) * 100;
  return row.oilYieldPercent != null && row.oilYieldPercent > 0 ? row.oilYieldPercent : null;
};

/** Written insights, most important first. Oil stays first so a single headline remains stable. */
const collectComparisons = (
  current: ComparableYear,
  previous: ComparableYear,
  scope: YearComparisonScope
): YearComparison[] => {
  const insights: YearComparison[] = [];
  const push = (kind: YearComparisonKind, percent: number | null) => {
    if (percent == null || !Number.isFinite(percent)) return;
    insights.push({ kind, percent, previousYear: previous.periodYear, scope });
  };

  if (harvestHasResult(current) && harvestHasResult(previous) && previous.oilKg > 0 && current.oilKg > 0) {
    push('oil', percentChange(current.oilKg, previous.oilKg));
  }
  if (harvestHasResult(current) && harvestHasResult(previous) && previous.oliveKg > 0 && current.oliveKg > 0) {
    push('olives', percentChange(current.oliveKg, previous.oliveKg));
  }
  if (current.expenseTotal > 0 && previous.expenseTotal > 0) {
    push('expenses', percentChange(current.expenseTotal, previous.expenseTotal));
  }
  const currentYield = yieldFromMass(current);
  const previousYield = yieldFromMass(previous);
  if (currentYield != null && previousYield != null) {
    const points = Math.round((currentYield - previousYield) * 10) / 10;
    if (Math.abs(points) >= 0.5) push('yield', points);
  }
  return insights;
};

const alignedYears = (
  a: ComparableYear,
  b: ComparableYear,
  options?: YearComparisonOptions
): { current: ComparableYear; previous: ComparableYear; scope: YearComparisonScope } | null => {
  const [current, previous] = a.periodYear >= b.periodYear ? [a, b] : [b, a];
  const now = options?.now ?? new Date();
  const liveYear = agriculturalYearFor(now);
  if (current.periodYear !== liveYear) {
    return { current, previous, scope: 'full' };
  }

  const prevMonths = options?.previousMonths;
  if (!prevMonths?.length) return null;

  const parts = athensParts(now);
  const previousSlice = sumMonthComparable(
    monthsThroughInclusive(prevMonths, parts.year - 1, parts.month)
  );
  const currentSlice = options?.currentMonths?.length
    ? sumMonthComparable(monthsThroughInclusive(options.currentMonths, parts.year, parts.month))
    : { oliveKg: current.oliveKg, oilKg: current.oilKg, expenseTotal: current.expenseTotal };

  const withSliceYield = (
    base: ComparableYear,
    slice: Pick<ChronologioPeriodSummary, 'oliveKg' | 'oilKg' | 'expenseTotal'>
  ): ComparableYear => ({
    ...base,
    ...slice,
    oilYieldPercent:
      slice.oliveKg > 0 && slice.oilKg > 0 ? (slice.oilKg / slice.oliveKg) * 100 : null,
  });

  return {
    current: withSliceYield(current, currentSlice),
    previous: withSliceYield(previous, previousSlice),
    scope: 'ytd',
  };
};

/**
 * Every fair comparison we can state. A live year is compared only through today
 * against the same dates last year — never a partial year against a finished one.
 */
export const yearComparisonInsights = (
  a?: ComparableYear | null,
  b?: ComparableYear | null,
  options?: YearComparisonOptions
): YearComparison[] => {
  if (!a || !b) return [];
  const aligned = alignedYears(a, b, options);
  if (!aligned) return [];
  return collectComparisons(aligned.current, aligned.previous, aligned.scope);
};

/**
 * Headline comparison. When the newer year is still live, compare the same
 * calendar span (YTD vs YTD) — never a partial year vs a full one.
 */
export const yearComparison = (
  a?: ComparableYear | null,
  b?: ComparableYear | null,
  options?: YearComparisonOptions
): YearComparison | null => yearComparisonInsights(a, b, options)[0] ?? null;

/** Same window the written insights use, so a live year is not priced against a finished year. */
export const fairYearPair = (
  a?: ComparableYear | null,
  b?: ComparableYear | null,
  options?: YearComparisonOptions
): { current: ComparableYear; previous: ComparableYear; scope: YearComparisonScope } | null => {
  if (!a || !b) return null;
  return alignedYears(a, b, options);
};

export const costPerOilKg = (expenseTotal: number, oilKg: number): number | null => {
  if (!(expenseTotal > 0) || !(oilKg > 0)) return null;
  return expenseTotal / oilKg;
};

export type ComparisonMonthLink = {
  year: number;
  month: number;
  metric: 'oil' | 'expenses';
  amount: number;
};

const monthValue = (row: ChronologioMonthSummary | undefined, metric: 'oil' | 'expenses'): number => {
  if (!row) return 0;
  return metric === 'oil' ? row.oilKg || 0 : row.expenseTotal || 0;
};

/** Months that account for the oil gap, or the expense gap when neither year has oil. */
export const comparisonDriverMonths = (
  newerMonths: ChronologioMonthSummary[],
  olderMonths: ChronologioMonthSummary[],
  newerYear: number,
  olderYear: number,
  options?: { now?: Date; limit?: number }
): ComparisonMonthLink[] => {
  const metric: 'oil' | 'expenses' =
    newerMonths.some((row) => row.oilKg > 0) || olderMonths.some((row) => row.oilKg > 0)
      ? 'oil'
      : 'expenses';
  const yearDelta = newerYear - olderYear;
  const now = options?.now ?? new Date();
  const liveYear = agriculturalYearFor(now);
  const cap = newerYear === liveYear ? athensParts(now) : null;
  const capOrdinal = cap ? monthOrdinal(cap.year, cap.month) : Number.POSITIVE_INFINITY;

  const ranked = agriculturalYearMonths(newerYear)
    .filter((slot) => monthOrdinal(slot.year, slot.month) <= capOrdinal)
    .map((slot) => {
      const olderSlot = { year: slot.year - yearDelta, month: slot.month };
      const newer = newerMonths.find((row) => row.year === slot.year && row.month === slot.month);
      const older = olderMonths.find((row) => row.year === olderSlot.year && row.month === olderSlot.month);
      const newerValue = monthValue(newer, metric);
      const olderValue = monthValue(older, metric);
      return {
        delta: newerValue - olderValue,
        links: [
          newerValue > 0
            ? { year: slot.year, month: slot.month, metric, amount: newerValue }
            : null,
          olderValue > 0
            ? { year: olderSlot.year, month: olderSlot.month, metric, amount: olderValue }
            : null,
        ].filter((link): link is ComparisonMonthLink => link != null),
      };
    })
    .filter((slot) => Math.abs(slot.delta) > (metric === 'oil' ? 0.5 : 0.5) && slot.links.length > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const links: ComparisonMonthLink[] = [];
  for (const slot of ranked) {
    for (const link of slot.links) {
      if (links.length >= (options?.limit ?? 4)) return links;
      links.push(link);
    }
  }
  return links;
};

/** i18n key under `yearView.compare.*`; pass `context: 'ytd'` when scope is ytd. */
export const yearComparisonCopyKey = (comparison: YearComparison): string => {
  if (comparison.kind === 'yield') return 'yearView.compare.yield';
  return `yearView.compare.${comparison.kind}${comparison.percent >= 0 ? 'Up' : 'Down'}`;
};

export const ensureCurrentAgriculturalYear = (
  summaries: ChronologioPeriodSummary[],
  now = new Date()
): ChronologioPeriodSummary[] => {
  const current = agriculturalYearFor(now);
  const byYear = new Map(summaries.map((row) => [row.periodYear, row]));
  if (!byYear.has(current)) {
    byYear.set(current, {
      ...emptyPeriodSummary(),
      key: `agricultural-${current}`,
      periodYear: current,
      axis: 'agricultural',
    });
  }
  return [...byYear.values()].sort((a, b) => b.periodYear - a.periodYear);
};

export const previousYearSummary = (
  summaries: ChronologioPeriodSummary[],
  periodYear: number
): ChronologioPeriodSummary | undefined =>
  summaries.find((row) => row.periodYear === periodYear - 1);

export const yearRecordCount = periodEventCount;

export type YearChapterFact =
  | { kind: 'work'; count: number }
  | { kind: 'notes'; count: number }
  | { kind: 'money'; amount: number; currency: string }
  | { kind: 'olives'; kg: number }
  | { kind: 'records'; count: number };

/** Only facts that exist. Zeros stay off the card. */
export const yearChapterFacts = (
  summary: ChronologioPeriodSummary,
  live = false
): YearChapterFact[] => {
  const facts: YearChapterFact[] = [];
  if (summary.taskCount > 0) facts.push({ kind: 'work', count: summary.taskCount });
  if (summary.noteCount > 0) facts.push({ kind: 'notes', count: summary.noteCount });
  if (summary.expenseTotal > 0) {
    facts.push({ kind: 'money', amount: summary.expenseTotal, currency: summary.currency });
  }
  if (!live && harvestHasResult(summary) && summary.oliveKg > 0) {
    facts.push({ kind: 'olives', kg: summary.oliveKg });
  }
  const records = yearRecordCount(summary);
  if (facts.length === 0 && records > 0) facts.push({ kind: 'records', count: records });
  return facts.slice(0, 4);
};
