import { athensCalendarYear } from './athensDate';
import { parseIsoDateParts } from './taskFormDates';

/**
 * ResultYear follows the Athens calendar year of the planned day.
 * January–February work can still belong to the previous harvest.
 */
export const deriveResultYear = (plannedIso?: string | null, now = new Date()): number => {
  if (plannedIso) {
    const parts = parseIsoDateParts(plannedIso);
    if (parts) return parts.year;
  }
  return athensCalendarYear(now);
};

export const crossesHarvestYear = (plannedIso?: string | null): boolean => {
  const parts = parseIsoDateParts(plannedIso);
  if (!parts) return false;
  return parts.month === 1 || parts.month === 2;
};

export const resultYearChoices = (plannedIso?: string | null, now = new Date()): number[] => {
  const derived = deriveResultYear(plannedIso, now);
  if (!crossesHarvestYear(plannedIso)) return [derived];
  return [derived - 1, derived];
};
