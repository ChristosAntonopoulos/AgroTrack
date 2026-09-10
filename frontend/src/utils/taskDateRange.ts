import { athensParts, parseBusinessDate } from './athensDate';

const EL_MONTH_SHORT = [
  'Ιαν',
  'Φεβ',
  'Μαρ',
  'Απρ',
  'Μαΐ',
  'Ιουν',
  'Ιουλ',
  'Αυγ',
  'Σεπ',
  'Οκτ',
  'Νοε',
  'Δεκ',
] as const;

const EL_MONTH_LONG_ACCUSATIVE = [
  'Ιανουάριο',
  'Φεβρουάριο',
  'Μάρτιο',
  'Απρίλιο',
  'Μάιο',
  'Ιούνιο',
  'Ιούλιο',
  'Αύγουστο',
  'Σεπτέμβριο',
  'Οκτώβριο',
  'Νοέμβριο',
  'Δεκέμβριο',
] as const;

const localeTag = (locale: string): string => {
  if (locale.startsWith('el')) return 'el-GR';
  if (locale.startsWith('it')) return 'it-IT';
  return 'en-GB';
};

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

const parseOptionalDate = (value?: string | Date | null): Date | null => {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : parseBusinessDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Prefer the UTC calendar date encoded in an API timestamp so end-of-day UTC does not roll into the next Athens day. */
const rangeParts = (date: Date, original?: string | Date | null) => {
  if (typeof original === 'string') {
    const match = ISO_DATE_PREFIX.exec(original.trim());
    if (match) {
      return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
      };
    }
  }
  return athensParts(date);
};

const monthShort = (month: number, locale: string, sample: Date): string => {
  if (locale.startsWith('el')) {
    return EL_MONTH_SHORT[month - 1] || '';
  }
  return sample
    .toLocaleDateString(localeTag(locale), { month: 'short', timeZone: 'Europe/Athens' })
    .replace('.', '');
};

const formatSingle = (
  date: Date,
  locale: string,
  withYear: boolean,
  original?: string | Date | null
): string => {
  const parts = rangeParts(date, original);
  const month = monthShort(parts.month, locale, date);
  if (!month) return '';
  return withYear ? `${parts.day} ${month} ${parts.year}` : `${parts.day} ${month}`;
};

/**
 * Greek field-work date ranges.
 * Same year: 1 Ιουν – 15 Ιουν 2026
 * Cross year: 1 Δεκ 2026 – 15 Ιαν 2027
 * Never drops the end year on a cross-year period.
 */
export const formatTaskDateRange = (
  start?: string | Date | null,
  end?: string | Date | null,
  locale = 'el'
): string => {
  const startDate = parseOptionalDate(start);
  const endDate = parseOptionalDate(end);

  if (!startDate && !endDate) return '';
  if (startDate && !endDate) return formatSingle(startDate, locale, true, start);
  if (!startDate && endDate) return formatSingle(endDate, locale, true, end);

  const startParts = rangeParts(startDate!, start);
  const endParts = rangeParts(endDate!, end);
  const sameDay =
    startParts.year === endParts.year &&
    startParts.month === endParts.month &&
    startParts.day === endParts.day;

  if (sameDay) return formatSingle(startDate!, locale, true, start);

  const crossYear = startParts.year !== endParts.year;
  const invalidOrder =
    !crossYear &&
    (endParts.month < startParts.month ||
      (endParts.month === startParts.month && endParts.day < startParts.day));

  if (crossYear || invalidOrder) {
    return `${formatSingle(startDate!, locale, true, start)} – ${formatSingle(endDate!, locale, true, end)}`;
  }

  return `${formatSingle(startDate!, locale, false, start)} – ${formatSingle(endDate!, locale, true, end)}`;
};

/** Compact period for planned rows when the year is already in the context bar. */
export const formatCompactTaskPeriod = (
  start?: string | Date | null,
  end?: string | Date | null,
  locale = 'el',
  contextYear?: number
): string => {
  const range = formatTaskDateRange(start, end, locale);
  if (!range || contextYear == null) return range;
  return range.replace(new RegExp(`\\s${contextYear}$`), '');
};

/** Single day for “Ξεκίνησε 1 Σεπ”; omits the year when it matches contextYear. */
export const formatTaskDay = (
  value?: string | Date | null,
  locale = 'el',
  contextYear?: number
): string => {
  const date = parseOptionalDate(value);
  if (!date) return '';
  const parts = rangeParts(date, value);
  const withYear = contextYear == null || parts.year !== contextYear;
  return formatSingle(date, locale, withYear, value);
};

export const formatApproximateMonth = (month: number, locale = 'el'): string => {
  if (month < 1 || month > 12) return '';
  if (locale.startsWith('el')) {
    return `Συνήθως τον ${EL_MONTH_LONG_ACCUSATIVE[month - 1]}`;
  }
  if (locale.startsWith('it')) {
    const name = new Date(2026, month - 1, 1).toLocaleDateString('it-IT', { month: 'long' });
    return `Di solito a ${name}`;
  }
  const name = new Date(2026, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
  return `Usually in ${name}`;
};

export const formatPhenologyWindow = (locale = 'el'): string => {
  if (locale.startsWith('el')) return 'Όταν ολοκληρωθεί η άνθηση';
  if (locale.startsWith('it')) return 'Quando termina la fioritura';
  return 'When flowering is complete';
};
