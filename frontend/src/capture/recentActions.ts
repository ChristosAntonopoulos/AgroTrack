const RECENT_KEY = 'Oleachron.capture.recentMoves';
const LAST_FIELD_KEY = 'Oleachron.capture.lastFieldId';
const MAX_RECENT = 12;

export function readRecentCaptureMoves(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberCaptureMove(id: string | undefined): void {
  if (!id) return;
  try {
    const next = [id, ...readRecentCaptureMoves().filter((x) => x !== id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readLastCaptureFieldId(): string | undefined {
  try {
    return localStorage.getItem(LAST_FIELD_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function rememberLastCaptureFieldId(fieldId: string | undefined): void {
  try {
    if (!fieldId) {
      localStorage.removeItem(LAST_FIELD_KEY);
      return;
    }
    localStorage.setItem(LAST_FIELD_KEY, fieldId);
  } catch {
    /* ignore quota / private mode */
  }
}
