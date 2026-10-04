import type { HarvestRecord } from '../services/harvestService';
import { getSeasonStartYear } from './harvestSeason';

export type FieldHarvestYearSummary = {
  seasonStartYear: number;
  sacks: number;
  oliveKg: number;
  oilKg: number;
  oilLitres: number;
  recordCount: number;
};

/** Group posted harvest records by Sep–Aug season start year. */
export const summarizeHarvestByYear = (records: HarvestRecord[]): FieldHarvestYearSummary[] => {
  const byYear = new Map<number, FieldHarvestYearSummary>();

  for (const row of records) {
    if (row.status === 'voided') continue;
    const seasonStartYear = getSeasonStartYear(row.harvestDate);
    const current = byYear.get(seasonStartYear) || {
      seasonStartYear,
      sacks: 0,
      oliveKg: 0,
      oilKg: 0,
      oilLitres: 0,
      recordCount: 0,
    };
    current.sacks += row.sackCount || 0;
    current.oliveKg += row.oliveKg || 0;
    current.oilKg += row.oilKg || 0;
    current.oilLitres += row.oilLitres || 0;
    current.recordCount += 1;
    byYear.set(seasonStartYear, current);
  }

  return [...byYear.values()].sort((a, b) => b.seasonStartYear - a.seasonStartYear);
};
