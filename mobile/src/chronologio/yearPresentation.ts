import type { ChronologioPeriodSummary } from '../services/chronologioService';
import { agriculturalYearFor } from './agriculturalYear';
import { harvestHasResult, isMeaningfulHighlight } from './monthPresentation';
import { periodEventCount } from '../utils/summaryFacts';

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

export const seasonStageIndex = (now = new Date()): number => {
  const month = now.getMonth() + 1;
  if (month >= 2 && month <= 3) return 0;
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  return 3;
};

export const nextSeasonStageIndex = (index: number): number =>
  Math.min(SEASON_STAGES.length - 1, index + 1);

export const seasonTrackFill = (stageIndex: number, complete = false): number =>
  complete ? 1 : Math.min(0.97, (Math.max(0, stageIndex) + 0.55) / SEASON_STAGES.length);

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

export const percentChange = (current: number, previous?: number | null): number | null => {
  if (previous == null || previous === 0 || Number.isNaN(previous)) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
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

export type YearChapterFact =
  | { kind: 'work'; count: number }
  | { kind: 'notes'; count: number }
  | { kind: 'money'; amount: number; currency: string }
  | { kind: 'olives'; kg: number }
  | { kind: 'records'; count: number };

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
  const records = periodEventCount(summary);
  if (facts.length === 0 && records > 0) facts.push({ kind: 'records', count: records });
  return facts.slice(0, 4);
};

export const previousYearSummary = (
  summaries: ChronologioPeriodSummary[],
  periodYear: number
): ChronologioPeriodSummary | undefined =>
  summaries.find((row) => row.periodYear === periodYear - 1);
