import type { ChronologioPeriodSummary } from '../services/chronologioService';
import { agriculturalYearFor } from './agriculturalYear';
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

export type YearComparisonKind = 'oil' | 'olives' | 'expenses';

export type YearComparison = {
  kind: YearComparisonKind;
  percent: number;
  previousYear: number;
};

export const yearComparison = (
  a?: Pick<ChronologioPeriodSummary, 'periodYear' | 'oliveKg' | 'oilKg' | 'expenseTotal'> | null,
  b?: Pick<ChronologioPeriodSummary, 'periodYear' | 'oliveKg' | 'oilKg' | 'expenseTotal'> | null
): YearComparison | null => {
  if (!a || !b) return null;
  const [current, previous] = a.periodYear >= b.periodYear ? [a, b] : [b, a];
  if (harvestHasResult(current) && harvestHasResult(previous) && previous.oilKg > 0 && current.oilKg > 0) {
    const percent = percentChange(current.oilKg, previous.oilKg);
    if (percent == null) return null;
    return { kind: 'oil', percent, previousYear: previous.periodYear };
  }
  if (harvestHasResult(current) && harvestHasResult(previous) && previous.oliveKg > 0) {
    const percent = percentChange(current.oliveKg, previous.oliveKg);
    if (percent == null) return null;
    return { kind: 'olives', percent, previousYear: previous.periodYear };
  }
  if (current.expenseTotal > 0 && previous.expenseTotal > 0) {
    const percent = percentChange(current.expenseTotal, previous.expenseTotal);
    if (percent == null) return null;
    return { kind: 'expenses', percent, previousYear: previous.periodYear };
  }
  return null;
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
