import { athensCalendarDateKey } from '../utils/athensDate';
import { formatLongTaskDate } from '../utils/taskFormDates';

/** Short chip label: "Σήμερα" or "2 Οκτωβρίου" / locale equivalent. */
export const formatCaptureDateChip = (
  isoOrLocal: string | undefined,
  language = 'el',
  todayKey = athensCalendarDateKey(new Date())
): string => {
  if (!isoOrLocal) {
    return language.startsWith('el') ? 'Σήμερα' : language.startsWith('it') ? 'Oggi' : 'Today';
  }
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
  if (language.startsWith('el')) {
    const m = /^(\S+)\s+(\d+)\s+(\S+)/.exec(long);
    if (m) return `${m[2]} ${m[3]}`;
  }
  return long;
};

export const dateInputValueFromOccurredAt = (isoOrLocal?: string): string => {
  if (!isoOrLocal) return athensCalendarDateKey(new Date());
  try {
    return athensCalendarDateKey(isoOrLocal);
  } catch {
    return athensCalendarDateKey(new Date());
  }
};
