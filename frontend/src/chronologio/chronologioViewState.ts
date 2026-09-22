import type { ChronologioZoom } from './livingTypes';

const SCROLL_KEY_PREFIX = 'oleachron.chronologio.scroll.v1.';
const FOCUS_KEY = 'oleachron.chronologio.focus.v1';

export type ChronologioFocusSnapshot = {
  focusDate: string;
  zoom: ChronologioZoom;
  fieldId?: string;
};

export type ChronologioReturnState = {
  search: string;
  scrollTop?: number;
  focusDate?: string;
  zoom?: ChronologioZoom;
};

export const chronologioScrollKey = (input: {
  zoom: ChronologioZoom;
  focusDate: string;
  fieldId?: string;
}): string => {
  const dateKey = (input.focusDate || '').slice(0, 10) || 'today';
  const fieldKey = input.fieldId?.trim() || 'all';
  return `${input.zoom}.${dateKey}.${fieldKey}`;
};

export const saveChronologioJournalScroll = (key: string, scrollTop: number): void => {
  try {
    sessionStorage.setItem(`${SCROLL_KEY_PREFIX}${key}`, String(Math.round(scrollTop)));
  } catch {
    // Ignore storage failures.
  }
};

export const readChronologioJournalScroll = (key: string): number | null => {
  try {
    const raw = sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${key}`);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

export const saveChronologioFocus = (snapshot: ChronologioFocusSnapshot): void => {
  try {
    sessionStorage.setItem(FOCUS_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures.
  }
};

export const readChronologioFocus = (): ChronologioFocusSnapshot | null => {
  try {
    const raw = sessionStorage.getItem(FOCUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChronologioFocusSnapshot;
    if (!parsed?.focusDate || !parsed?.zoom) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const isChronologioReturnState = (
  value: unknown
): value is ChronologioReturnState => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as ChronologioReturnState;
  return typeof candidate.search === 'string';
};
