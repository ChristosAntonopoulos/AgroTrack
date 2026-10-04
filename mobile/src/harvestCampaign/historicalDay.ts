import type { HarvestRecord } from '../services/harvestService';
import { athensCalendarDateKey } from '../utils/athensDate';
import { isAthensDateKey } from './workingDay';

export { isAthensDateKey };

/** Posted (non-voided) harvest records for an Athens calendar day. */
export const harvestRecordsForDay = (
  rows: HarvestRecord[],
  day: string,
  fieldId?: string | null
): HarvestRecord[] => {
  if (!isAthensDateKey(day)) return [];
  return rows.filter((row) => {
    if (row.status === 'voided') return false;
    if (fieldId && row.fieldId !== fieldId) return false;
    return athensCalendarDateKey(row.harvestDate) === day;
  });
};

export const findPostedHarvestRecord = (
  rows: HarvestRecord[],
  harvestId: string
): HarvestRecord | null => {
  const hit = rows.find((row) => row.id === harvestId);
  if (!hit || hit.status === 'voided') return null;
  return hit;
};

export type HistoricalHarvestDeepLink =
  | { kind: 'idle' }
  | { kind: 'record'; harvestId: string; fieldId: string }
  | { kind: 'day'; day: string; fieldId: string }
  | { kind: 'dayMissing'; day: string; fieldId?: string }
  | { kind: 'recordMissing'; harvestId: string; fieldId: string };

/**
 * Classify Chronologio → Harvest deep-link intent from URL/route params.
 * Does not require a live local campaign.
 */
export const resolveHistoricalHarvestLink = (params: {
  day?: string | null;
  fieldId?: string | null;
  harvestId?: string | null;
}): HistoricalHarvestDeepLink => {
  const harvestId = params.harvestId?.trim() || null;
  const fieldId = params.fieldId?.trim() || null;
  const day = params.day?.trim() || null;

  if (harvestId && fieldId) {
    return { kind: 'record', harvestId, fieldId };
  }
  if (day && isAthensDateKey(day) && fieldId) {
    return { kind: 'day', day, fieldId };
  }
  if (day && isAthensDateKey(day)) {
    return { kind: 'dayMissing', day, fieldId: fieldId || undefined };
  }
  return { kind: 'idle' };
};

export const summarizeHistoricalDay = (rows: HarvestRecord[]) => {
  let sacks = 0;
  let oliveKg = 0;
  let oilKg = 0;
  let workers = 0;
  for (const row of rows) {
    sacks += row.sackCount || 0;
    oliveKg += row.oliveKg || 0;
    oilKg += row.oilKg || 0;
    workers += row.workersUsed || 0;
  }
  return { sacks, oliveKg, oilKg, workers, count: rows.length };
};
