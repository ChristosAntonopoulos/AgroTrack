import type { AppColors } from '../theme/themes';
import { eventAccentToken, type EventAccentToken } from '../chronologio/eventCardLayout';

/**
 * Resolve Chronologio accent colors from theme tokens (same mapping as web).
 */
export const accentColorsForToken = (
  colors: AppColors,
  token: EventAccentToken
): { accent: string; soft: string } => {
  switch (token) {
    case 'work':
      return { accent: colors.eventWork, soft: colors.eventWorkSoft };
    case 'observation':
      return { accent: colors.eventObservation, soft: colors.eventObservationSoft };
    case 'expense':
      return { accent: colors.eventExpense, soft: colors.eventExpenseSoft };
    case 'income':
      return { accent: colors.eventIncome, soft: colors.eventIncomeSoft };
    case 'harvest':
      return { accent: colors.eventHarvest, soft: colors.eventHarvestSoft };
    case 'weather':
      return { accent: colors.eventWeather, soft: colors.eventWeatherSoft };
    case 'warning':
      return { accent: colors.eventWarning, soft: colors.eventWarningSoft };
    case 'field_change':
    default:
      return { accent: colors.eventFieldChange, soft: colors.eventFieldChangeSoft };
  }
};

export const resolveChronologioCategoryAccent = (
  colors: AppColors,
  category?: string | null,
  importance?: string | null
): string => accentColorsForToken(colors, eventAccentToken(category, importance)).accent;

export const resolveChronologioCategorySoft = (
  colors: AppColors,
  category?: string | null,
  importance?: string | null
): string => accentColorsForToken(colors, eventAccentToken(category, importance)).soft;

/** @deprecated Prefer theme-aware helpers above */
export const CHRONOLOGIO_CATEGORY_ACCENTS: Record<string, string> = {
  task: '#5E7848',
  expense: '#99662D',
  income: '#36734D',
  harvest: '#8B4F49',
  note: '#755D8C',
  weather: '#39798D',
  intelligence: '#A74435',
  lifecycle: '#59696B',
  collaborator: '#59696B',
  photo: '#755D8C',
  default: '#59696B',
};

/** @deprecated Prefer theme-aware helpers above */
export const CHRONOLOGIO_CATEGORY_SOFT: Record<string, string> = {
  task: 'rgba(94, 120, 72, 0.14)',
  expense: 'rgba(153, 102, 45, 0.14)',
  income: 'rgba(54, 115, 77, 0.14)',
  harvest: 'rgba(139, 79, 73, 0.14)',
  note: 'rgba(117, 93, 140, 0.14)',
  weather: 'rgba(57, 121, 141, 0.14)',
  intelligence: 'rgba(167, 68, 53, 0.14)',
  lifecycle: 'rgba(89, 105, 107, 0.14)',
  collaborator: 'rgba(89, 105, 107, 0.14)',
  photo: 'rgba(117, 93, 140, 0.14)',
  default: 'rgba(89, 105, 107, 0.14)',
};
