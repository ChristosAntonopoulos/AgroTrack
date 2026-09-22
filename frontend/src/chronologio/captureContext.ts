import type { CaptureType } from '../capture/types';
import { agriculturalYearFor } from './agriculturalYear';
import { athensCalendarDateKey, athensParts } from '../utils/athensDate';
import { formatMonthHeading } from '../utils/taskFormDates';
import type { ChronologioZoom, LivingCategory } from './livingTypes';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Map Chronologio filter category → Capture preferred type (undefined = chooser). */
export const preferredCaptureTypeFromCategory = (
  category: LivingCategory | string
): CaptureType | undefined => {
  const first = category.split(',')[0]?.trim() || category;
  if (category.includes(',')) return undefined;
  switch (first) {
    case 'work':
    case 'task':
      return 'work';
    case 'observation':
    case 'note':
    case 'photo':
      return 'observation';
    case 'money':
    case 'expense':
    case 'income':
      return 'money';
    case 'harvest':
      return 'harvest';
    default:
      return undefined;
  }
};

const parseFocusYmd = (focusDate: string): { year: number; month: number; day: number } | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(focusDate.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
};

/** Local datetime ISO for an Athens calendar day, keeping the clock from `now`. */
export const occurredAtForCalendarDay = (ymd: string, now = new Date()): string => {
  const parts = parseFocusYmd(ymd);
  if (!parts) return now.toISOString();
  // Local Date so datetime-local matches the focused grove calendar day.
  const local = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    now.getHours(),
    now.getMinutes(),
    0,
    0
  );
  return local.toISOString();
};

export type ChronologioCaptureDate = {
  occurredAt: string;
  /** True only when the date was moved to today from a different period. */
  dateDefaultedToToday: boolean;
  /** Past month or past agricultural year — the user should pick a date inside it. */
  dateNeedsChoice: boolean;
  focusDayKey: string;
  periodLabel: string;
};

const monthPeriodLabel = (year: number, month: number, language = 'el') =>
  formatMonthHeading(year, month, language);

/**
 * Capture date from Chronologio chrome:
 * - Days → the exact day on screen
 * - Current month or current agricultural year → today, without an “older period” warning
 * - Past month or past year → a date inside that period, and a prompt to confirm it
 */
export const resolveChronologioCaptureDate = (args: {
  zoom: ChronologioZoom;
  focusDate: string;
  now?: Date;
  language?: string;
}): ChronologioCaptureDate => {
  const now = args.now ?? new Date();
  const language = args.language || 'el';
  const todayKey = athensCalendarDateKey(now);
  const focus = parseFocusYmd(args.focusDate);
  const focusDayKey = focus
    ? `${focus.year}-${pad2(focus.month)}-${pad2(focus.day)}`
    : todayKey;
  const nowParts = athensParts(now);
  const focusYear = focus?.year ?? nowParts.year;
  const focusMonth = focus?.month ?? nowParts.month;
  const liveMonth = focusYear === nowParts.year && focusMonth === nowParts.month;
  const liveAgriYear = agriculturalYearFor(focusDayKey) === agriculturalYearFor(now);

  if (args.zoom === 'month') {
    return {
      occurredAt: occurredAtForCalendarDay(focusDayKey, now),
      dateDefaultedToToday: false,
      dateNeedsChoice: false,
      focusDayKey,
      periodLabel: monthPeriodLabel(focusYear, focusMonth, language),
    };
  }

  if (args.zoom === 'year') {
    if (liveMonth) {
      return {
        occurredAt: now.toISOString(),
        dateDefaultedToToday: false,
        dateNeedsChoice: false,
        focusDayKey: todayKey,
        periodLabel: monthPeriodLabel(nowParts.year, nowParts.month, language),
      };
    }
    const anchor = `${focusYear}-${pad2(focusMonth)}-01`;
    return {
      occurredAt: occurredAtForCalendarDay(anchor, now),
      dateDefaultedToToday: false,
      dateNeedsChoice: true,
      focusDayKey: anchor,
      periodLabel: monthPeriodLabel(focusYear, focusMonth, language),
    };
  }

  if (liveAgriYear) {
    return {
      occurredAt: now.toISOString(),
      dateDefaultedToToday: false,
      dateNeedsChoice: false,
      focusDayKey: todayKey,
      periodLabel: String(agriculturalYearFor(now)),
    };
  }

  const agri = agriculturalYearFor(focusDayKey);
  const anchor = `${agri}-02-01`;
  return {
    occurredAt: occurredAtForCalendarDay(anchor, now),
    dateDefaultedToToday: false,
    dateNeedsChoice: true,
    focusDayKey: anchor,
    periodLabel: String(agri),
  };
};
