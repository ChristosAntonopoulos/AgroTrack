/** Field id from `/fields/:id` (ignores `/fields/new`). */
export const fieldIdFromPath = (pathname: string): string | null => {
  const match = /^\/fields\/([^/]+)/.exec(pathname || '');
  if (!match) return null;
  const id = match[1];
  if (!id || id === 'new') return null;
  return id;
};

/**
 * Resolve which grove Καταγραφή should use (QA-024).
 * Only a grove the user is explicitly "in" is inherited: the launch context
 * (a field action) or the field route. Global capture (Chronologio, Money, …)
 * returns '' so the user must choose — never the active/last grove, never the first.
 * `activeFieldId` and the remembered ids are accepted for call-site compatibility
 * but deliberately ignored.
 */
export const resolveCaptureFieldId = (input: {
  contextFieldId?: string;
  pathname: string;
  /** @deprecated ignored: an ambient selection is not an explicit choice. */
  activeFieldId?: string | null;
  /** @deprecated ignored. */
  lastCaptureFieldId?: string;
  /** @deprecated ignored. */
  lastMoneyFieldId?: string;
  availableIds: readonly string[];
}): string => {
  const available = input.availableIds;
  const candidates = [input.contextFieldId, fieldIdFromPath(input.pathname) || undefined].filter(
    (id): id is string => Boolean(id)
  );

  if (available.length === 0) {
    return candidates[0] || '';
  }

  for (const id of candidates) {
    if (available.includes(id)) return id;
  }
  return '';
};

/** True when the grove comes from where capture was launched (field action or field page). */
export const isInheritedCaptureField = (contextFieldId: string | undefined, pathname: string): boolean =>
  Boolean(contextFieldId || fieldIdFromPath(pathname));
