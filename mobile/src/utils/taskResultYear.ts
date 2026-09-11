import { parseIsoDateParts } from './taskFormDates';
import { athensParts, parseBusinessDate } from './athensDate';

const AGRICULTURAL_YEAR_START_MONTH = 2;

const agriculturalYearFor = (value: Date): number => {
  const parts = athensParts(parseBusinessDate(value));
  return parts.month >= AGRICULTURAL_YEAR_START_MONTH ? parts.year : parts.year - 1;
};

/**
 * ResultYear follows the olive agricultural year (1 Feb Y – 31 Jan Y+1).
 * January work stays with the harvest that started the previous February.
 */
export const deriveResultYear = (plannedIso?: string | null, now = new Date()): number => {
  if (plannedIso) {
    const parts = parseIsoDateParts(plannedIso);
    if (parts) return parts.month >= 2 ? parts.year : parts.year - 1;
  }
  return agriculturalYearFor(now);
};

export const crossesHarvestYear = (plannedIso?: string | null): boolean => {
  const parts = parseIsoDateParts(plannedIso);
  if (!parts) return false;
  return parts.month === 1 || parts.month === 2;
};

export const resultYearChoices = (plannedIso?: string | null, now = new Date()): number[] => {
  const derived = deriveResultYear(plannedIso, now);
  if (!crossesHarvestYear(plannedIso)) return [derived];
  const parts = parseIsoDateParts(plannedIso);
  const calendar = parts?.year ?? derived;
  return [...new Set([derived, calendar])].sort((a, b) => a - b);
};
