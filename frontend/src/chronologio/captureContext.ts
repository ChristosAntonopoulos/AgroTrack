import type { CaptureType } from '../capture/types';
import { athensCalendarDateKey, athensParts } from '../utils/athensDate';
import type { ChronologioZoom, LivingCategory } from './livingTypes';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Map Chronologio filter category → Capture preferred type (undefined = chooser). */
export const preferredCaptureTypeFromCategory = (
  category: LivingCategory
): CaptureType | undefined => {
  switch (category) {
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

/**
 * Capture date from Chronologio chrome:
 * - Days view of the current (live) month → focused day
 * - Otherwise (older month/year, Months/Years) → today, flagged for UI copy
 */
export const resolveChronologioCaptureDate = (args: {
  zoom: ChronologioZoom;
  focusDate: string;
  now?: Date;
}): { occurredAt: string; dateDefaultedToToday: boolean; focusDayKey: string } => {
  const now = args.now ?? new Date();
  const todayKey = athensCalendarDateKey(now);
  const focus = parseFocusYmd(args.focusDate);
  const focusDayKey = focus
    ? `${focus.year}-${pad2(focus.month)}-${pad2(focus.day)}`
    : todayKey;
  const nowParts = athensParts(now);
  const isDaysView = args.zoom === 'month';
  const isLiveMonth =
    Boolean(focus) && focus!.year === nowParts.year && focus!.month === nowParts.month;

  if (isDaysView && isLiveMonth) {
    return {
      occurredAt: occurredAtForCalendarDay(focusDayKey, now),
      dateDefaultedToToday: false,
      focusDayKey,
    };
  }

  return {
    occurredAt: now.toISOString(),
    dateDefaultedToToday: true,
    focusDayKey: todayKey,
  };
};
