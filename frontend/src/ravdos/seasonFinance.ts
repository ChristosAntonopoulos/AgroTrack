import {
  getSeasonBounds,
  getSeasonStartYear,
  listRecentSeasonYears,
  type SeasonBounds,
} from '../utils/harvestSeason';
import { isDateInSeason } from '../utils/harvestSeason';
import type { HarvestRecord, FieldSummaryData } from '../data/mockReportData';

/** Calendar years that overlap a cultivation season (usually 2). */
export const overlappingCalendarYears = (seasonStartYear: number): string[] => [
  String(seasonStartYear),
  String(seasonStartYear + 1),
];

export const filterHarvestsForSeason = (
  records: HarvestRecord[],
  bounds: SeasonBounds
): HarvestRecord[] =>
  records.filter((row) => isDateInSeason(row.harvestDate, bounds));

export interface SoftPnl {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitByField: Array<{ fieldId: string; fieldName: string; cost?: number; revenue?: number }>;
}

export interface SeasonFinanceSnapshot {
  oliveKg: number;
  oilKg: number;
  spent: number;
  received: number;
  net: number;
  fieldCards: Array<{
    fieldId: string;
    fieldName: string;
    oliveKg: number;
    oilKg: number;
    spent: number;
    received: number;
  }>;
}

export const buildSeasonFinance = (
  harvests: HarvestRecord[],
  pnl: SoftPnl | null,
  summaries: FieldSummaryData[],
  bounds: SeasonBounds
): SeasonFinanceSnapshot => {
  const inSeason = filterHarvestsForSeason(harvests, bounds);
  const kgByField = new Map<string, number>();
  const oilByField = new Map<string, number>();
  let oliveKg = 0;
  let oilKg = 0;
  for (const row of inSeason) {
    oliveKg += row.oliveKg || 0;
    oilKg += row.oilKg || 0;
    kgByField.set(row.fieldId, (kgByField.get(row.fieldId) ?? 0) + (row.oliveKg || 0));
    oilByField.set(row.fieldId, (oilByField.get(row.fieldId) ?? 0) + (row.oilKg || 0));
  }

  const profitByField = new Map((pnl?.profitByField ?? []).map((row) => [row.fieldId, row]));
  const fieldIds = new Set<string>([
    ...summaries.map((s) => s.fieldId),
    ...kgByField.keys(),
    ...profitByField.keys(),
  ]);

  const fieldCards = Array.from(fieldIds)
    .map((fieldId) => {
      const summary = summaries.find((s) => s.fieldId === fieldId);
      const profit = profitByField.get(fieldId);
      return {
        fieldId,
        fieldName: summary?.fieldName || profit?.fieldName || fieldId,
        oliveKg: kgByField.get(fieldId) ?? 0,
        oilKg: oilByField.get(fieldId) ?? 0,
        spent: profit?.cost ?? 0,
        received: profit?.revenue ?? 0,
      };
    })
    .filter((card) => card.oliveKg > 0 || card.oilKg > 0 || card.spent > 0 || card.received > 0);

  const spent = Number(pnl?.totalExpenses ?? 0);
  const received = Number(pnl?.totalIncome ?? 0);
  return {
    oliveKg,
    oilKg,
    spent,
    received,
    net: Number(pnl?.netProfit ?? received - spent),
    fieldCards,
  };
};

export { getSeasonBounds, getSeasonStartYear, listRecentSeasonYears };
