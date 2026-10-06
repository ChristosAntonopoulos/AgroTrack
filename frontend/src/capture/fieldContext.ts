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
 * Order: current context → selected/route grove → last choice. Never the first grove.
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
  ].filter((id): id is string => Boolean(id));

  if (available.length === 0) {
    return candidates[0] || '';
  }

  for (const id of candidates) {
    if (available.includes(id)) return id;
  }
  return '';
};
