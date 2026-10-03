import { athensCalendarDateKey } from '../utils/athensDate';
import { formatLongTaskDate } from '../utils/taskFormDates';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Short chip label: "Σήμερα" or "2 Οκτ" / locale equivalent. */
export const formatCaptureDateChip = (
  isoOrLocal: string | undefined,
  language = 'el',
  todayKey = athensCalendarDateKey(new Date())
): string => {
  if (!isoOrLocal) return language.startsWith('el') ? 'Σήμερα' : language.startsWith('it') ? 'Oggi' : 'Today';
  let dayKey: string;
  try {
    dayKey = athensCalendarDateKey(isoOrLocal);
  } catch {
    return language.startsWith('el') ? 'Σήμερα' : language.startsWith('it') ? 'Oggi' : 'Today';
  }
  if (dayKey === todayKey) {
    return language.startsWith('el') ? 'Σήμερα' : language.startsWith('it') ? 'Oggi' : 'Today';
  }
  const long = formatLongTaskDate(dayKey, language);
  if (!long) return dayKey;
  // Prefer a compact "2 Οκτωβρίου" style from the long form when possible.
  if (language.startsWith('el')) {
    const m = /^(\S+)\s+(\d+)\s+(\S+)/.exec(long);
    if (m) return `${m[2]} ${m[3]}`;
  }
  return long;
};

/** YYYY-MM-DD for `<input type="date">` from ISO / local datetime. */
export const dateInputValueFromOccurredAt = (isoOrLocal?: string): string => {
  if (!isoOrLocal) return athensCalendarDateKey(new Date());
  try {
    return athensCalendarDateKey(isoOrLocal);
  } catch {
    return athensCalendarDateKey(new Date());
  }
};

/** Keep clock from previous value when the farmer only changes the calendar day. */
export const occurredAtFromDateInput = (ymd: string, previousLocal?: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return new Date().toISOString();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let hours = 12;
  let minutes = 0;
  if (previousLocal) {
    const prev = new Date(previousLocal.includes('T') && !previousLocal.endsWith('Z')
      ? previousLocal
      : previousLocal);
    if (!Number.isNaN(prev.getTime())) {
      hours = prev.getHours();
      minutes = prev.getMinutes();
    }
  } else {
    const now = new Date();
    hours = now.getHours();
    minutes = now.getMinutes();
  }
  const local = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return local.toISOString();
};

/** Local datetime-local string for drawer state from a calendar day. */
export const toDateTimeLocalFromDay = (ymd: string, previousLocal?: string): string => {
  const iso = occurredAtFromDateInput(ymd, previousLocal);
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
