/** Field id from `/fields/:id` (ignores `/fields/new`). */
export const fieldIdFromPath = (pathname: string): string | null => {
  const match = /^\/fields\/([^/]+)/.exec(pathname || '');
  if (!match) return null;
  const id = match[1];
  if (!id || id === 'new') return null;
  return id;
};

/**
 * Resolve which grove Καταγραφή should use.
 * Order: explicit context → route field → active field → last capture → last money → first available.
 */
export const resolveCaptureFieldId = (input: {
  contextFieldId?: string;
  pathname: string;
  activeFieldId?: string | null;
  lastCaptureFieldId?: string;
  lastMoneyFieldId?: string;
  availableIds: readonly string[];
}): string => {
  const available = input.availableIds;
  const candidates = [
    input.contextFieldId,
    fieldIdFromPath(input.pathname) || undefined,
    input.activeFieldId || undefined,
    input.lastCaptureFieldId,
    input.lastMoneyFieldId,
    available[0],
  ].filter((id): id is string => Boolean(id));

  if (available.length === 0) {
    return candidates[0] || '';
  }

  for (const id of candidates) {
    if (available.includes(id)) return id;
  }
  return available[0] || '';
};
