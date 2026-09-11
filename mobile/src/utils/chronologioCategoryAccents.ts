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
  task: '#617A4E',
  expense: '#B09A63',
  income: '#60776D',
  harvest: '#985F52',
  note: '#79698A',
  weather: '#39798D',
  intelligence: '#A74435',
  lifecycle: '#60776D',
  collaborator: '#60776D',
  photo: '#79698A',
  default: '#60776D',
};

/** @deprecated Prefer theme-aware helpers above */
export const CHRONOLOGIO_CATEGORY_SOFT: Record<string, string> = {
  task: '#E9EFE4',
  expense: '#F5ECDF',
  income: '#E6ECE9',
  harvest: '#F3E7E3',
  note: '#EEEAF2',
  weather: '#E6EEF0',
  intelligence: '#F5E6E3',
  lifecycle: '#E6ECE9',
  collaborator: '#E6ECE9',
  photo: '#EEEAF2',
  default: '#E6ECE9',
};
