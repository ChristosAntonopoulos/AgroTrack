import { athensParts, parseBusinessDate } from '../utils/athensDate';
import { ROD_PHASE_ORDER, type RodPhaseId } from './progressModel';

export type SeasonStoryState = 'growing' | 'harvesting' | 'closing';

/** Where the trees are in the Mediterranean olive year, not a completion score. */
export const calendarRodPhase = (now: Date | string = new Date()): RodPhaseId => {
  const month = athensParts(parseBusinessDate(now)).month;
  if (month >= 10 || month === 1) return 'harvest';
  if (month >= 2 && month <= 3) return 'dormancy';
  if (month === 4) return 'bud_break';
  if (month === 5) return 'flowering';
  return 'fruit_growth';
};

export const nextCalendarRodPhase = (phase: RodPhaseId): RodPhaseId | null => {
  const index = ROD_PHASE_ORDER.indexOf(phase);
  if (index < 0 || index >= ROD_PHASE_ORDER.length - 1) return null;
  return ROD_PHASE_ORDER[index + 1];
};

export const seasonStoryState = (input: {
  oliveKg: number;
  oilKg: number;
  harvestClosed: boolean;
}): SeasonStoryState => {
  if (input.harvestClosed) return 'closing';
  if (input.oliveKg > 0 || input.oilKg > 0) return 'harvesting';
  return 'growing';
};
