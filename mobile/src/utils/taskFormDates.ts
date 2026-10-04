import { athensParts } from './athensDate';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const EL_WEEKDAYS = [
  'Κυριακή',
  'Δευτέρα',
  'Τρίτη',
  'Τετάρτη',
  'Πέμπτη',
  'Παρασκευή',
  'Σάββατο',
] as const;

const EL_WEEKDAYS_SHORT = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'] as const;

const EL_MONTH_GENITIVE = [
  'Ιανουαρίου',
  'Φεβρουαρίου',
  'Μαρτίου',
  'Απριλίου',
  'Μαΐου',
  'Ιουνίου',
  'Ιουλίου',
  'Αυγούστου',
  'Σεπτεμβρίου',
  'Οκτωβρίου',
  'Νοεμβρίου',
  'Δεκεμβρίου',
] as const;

const EL_MONTH_NOMINATIVE = [
  'Ιανουάριος',
  'Φεβρουάριος',
  'Μάρτιος',
  'Απρίλιος',
  'Μάιος',
  'Ιούνιος',
  'Ιούλιος',
  'Αύγουστος',
  'Σεπτέμβριος',
  'Οκτώβριος',
  'Νοέμβριος',
  'Δεκέμβριος',
] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

export type DateParts = { year: number; month: number; day: number };

export const isIsoDate = (value?: string | null): value is string =>
  Boolean(value && ISO_DATE.test(value.trim()));

export const parseIsoDateParts = (value?: string | null): DateParts | null => {
  if (!value) return null;
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

export const toIsoDate = (year: number, month: number, day: number): string =>
  `${year}-${pad2(month)}-${pad2(day)}`;

export const athensTodayIso = (now = new Date()): string => {
  const parts = athensParts(now);
  return toIsoDate(parts.year, parts.month, parts.day);
};

export const addDaysToIso = (iso: string, days: number): string => {
  const parts = parseIsoDateParts(iso);
  if (!parts) return '';
  const date = new Date(parts.year, parts.month - 1, parts.day + days);
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

export const localDateFromIso = (iso: string): Date | null => {
  const parts = parseIsoDateParts(iso);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
};

/** Sunday of the Athens week that contains `iso` (Mon–Sun). */
export const weekSundayIso = (iso: string): string => {
  const date = localDateFromIso(iso);
  if (!date) return '';
  const weekday = date.getDay();
  const daysToSunday = weekday === 0 ? 0 : 7 - weekday;
  return addDaysToIso(iso, daysToSunday);
};

export const toStartIso = (iso?: string | null): string | undefined => {
  if (!isIsoDate(iso)) return undefined;
  return `${iso}T00:00:00.000Z`;
};

export const toEndIso = (iso?: string | null): string | undefined => {
  if (!isIsoDate(iso)) return undefined;
  return `${iso}T23:59:59.999Z`;
};

export const weekdayIndexMondayFirst = (year: number, month: number, day: number): number => {
  const js = new Date(year, month - 1, day).getDay();
  return js === 0 ? 6 : js - 1;
};

export const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

export const formatLongTaskDate = (iso?: string | null, locale = 'el'): string => {
  const parts = parseIsoDateParts(iso);
  if (!parts) return '';
  const date = localDateFromIso(iso!)!;
  if (locale.toLowerCase().startsWith('el')) {
    return `${EL_WEEKDAYS[date.getDay()]} ${parts.day} ${EL_MONTH_GENITIVE[parts.month - 1]} ${parts.year}`;
  }
  return date.toLocaleDateString(locale.toLowerCase().startsWith('it') ? 'it-IT' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatMonthHeading = (year: number, month: number, locale = 'el'): string => {
  if (locale.toLowerCase().startsWith('el')) {
    return `${EL_MONTH_NOMINATIVE[month - 1]} ${year}`;
  }
  return new Date(year, month - 1, 1).toLocaleDateString(
    locale.toLowerCase().startsWith('it') ? 'it-IT' : 'en-GB',
    { month: 'long', year: 'numeric' }
  );
};

export const greekWeekdayHeaders = (): readonly string[] => EL_WEEKDAYS_SHORT;
