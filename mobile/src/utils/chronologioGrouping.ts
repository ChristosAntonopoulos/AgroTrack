import type { ChronologioEntry } from '../services/chronologioService';
// Shared grouping logic with web Chronologio.

export type ChronologioDayKind = 'today' | 'yesterday' | 'day';

export type ChronologioDayGroup = {
  key: string;
  kind: ChronologioDayKind;
  date: Date;
  entries: ChronologioEntry[];
};

export type ChronologioMonthGroup = {
  key: string;
  year: number;
  month: number;
  days: ChronologioDayGroup[];
};

export type ChronologioTimelineModel = {
  months: ChronologioMonthGroup[];
};

const startOfLocalDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Groups Chronologio entries newest-first into Year/Month → day (Today/Yesterday/date) → events.
 */
export const groupChronologioEntries = (
  entries: ChronologioEntry[],
  now: Date = new Date()
): ChronologioTimelineModel => {
  const today = startOfLocalDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const byMonth = new Map<string, ChronologioMonthGroup>();

  for (const entry of entries) {
    const occurred = new Date(entry.occurredAt);
    if (Number.isNaN(occurred.getTime())) continue;

    const dayStart = startOfLocalDay(occurred);
    const mKey = monthKey(dayStart);
    let month = byMonth.get(mKey);
    if (!month) {
      month = {
        key: mKey,
        year: dayStart.getFullYear(),
        month: dayStart.getMonth(),
        days: [],
      };
      byMonth.set(mKey, month);
    }

    const dKey = dayKey(dayStart);
    let day = month.days.find((d) => d.key === dKey);
    if (!day) {
      let kind: ChronologioDayKind = 'day';
      if (dayStart.getTime() === today.getTime()) kind = 'today';
      else if (dayStart.getTime() === yesterday.getTime()) kind = 'yesterday';
      day = { key: dKey, kind, date: dayStart, entries: [] };
      month.days.push(day);
    }
    day.entries.push(entry);
  }

  const months = [...byMonth.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  for (const month of months) {
    month.days.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  return { months };
};

export const formatChronologioMoney = (
  value: number,
  currency: string,
  locale: string
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${currency || 'EUR'}`;
  }
};

export const PAGE_SIZE = 30;
