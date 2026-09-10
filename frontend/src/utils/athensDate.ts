/** Business calendar for Oleachron is Europe/Athens. */
export const ATHENS_TIME_ZONE = 'Europe/Athens';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

const pad2 = (n: number) => String(n).padStart(2, '0');

export type CalendarParts = { year: number; month: number; day: number };

export const athensParts = (value: Date): CalendarParts => {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: ATHENS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(value)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
};

/** Parse API dates so a date-only value does not shift by one day. */
export const parseBusinessDate = (value: string | Date | number): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const match = DATE_ONLY.exec(value.trim());
  if (match && (value.length === 10 || value.charAt(10) === 'T' && value.endsWith('Z') === false && value.includes('T00:00'))) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (value.length === 10) {
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }
  }
  if (match && value.length === 10) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  }
  return new Date(value);
};

export const athensCalendarYear = (value: string | Date | number): number =>
  athensParts(parseBusinessDate(value)).year;

export const athensCalendarDateKey = (value: string | Date | number): string => {
  const p = athensParts(parseBusinessDate(value));
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
};

export const startOfLocalDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const isSameLocalDay = (a: Date, b: Date): boolean =>
  startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
