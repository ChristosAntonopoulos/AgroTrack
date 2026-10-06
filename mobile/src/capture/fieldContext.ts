/**
 * Resolve which grove Καταγραφή should use.
 * Order: current context → selected/route grove → last choice. Never the first grove.
 */
export const resolveCaptureFieldId = (input: {
  contextFieldId?: string;
  routeFieldId?: string | null;
  activeFieldId?: string | null;
  lastCaptureFieldId?: string;
  lastMoneyFieldId?: string;
  availableIds: readonly string[];
}): string => {
  const available = input.availableIds;
  const candidates = [
    input.contextFieldId,
    input.routeFieldId || undefined,
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

export const fieldIdFromRouteParams = (
  params?: Record<string, unknown> | null
): string | undefined => {
  if (!params) return undefined;
  const id = params.fieldId ?? params.field;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
};
