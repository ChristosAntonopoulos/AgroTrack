/**
 * Resolve which field a harvest capture should use.
 * Never silently fall back to “first field from the API list” when the campaign
 * has an explicit participating set.
 */
export const resolveHarvestCaptureFieldId = (opts: {
  preferredFieldId?: string | null;
  campaignFieldOrder: string[];
  /** When editing an existing entry that already has a field. */
  initialFieldId?: string | null;
  /** Allowed field ids for this sheet (usually campaign participants). */
  allowedFieldIds?: string[];
}): string => {
  const allowed =
    opts.allowedFieldIds && opts.allowedFieldIds.length > 0
      ? new Set(opts.allowedFieldIds)
      : null;
  const ok = (id: string | null | undefined) =>
    Boolean(id) && (!allowed || allowed.has(id!));

  if (ok(opts.initialFieldId)) return opts.initialFieldId!;
  if (ok(opts.preferredFieldId)) return opts.preferredFieldId!;

  if (opts.campaignFieldOrder.length === 1 && ok(opts.campaignFieldOrder[0])) {
    return opts.campaignFieldOrder[0];
  }
  if (opts.campaignFieldOrder.length > 1) {
    return '';
  }

  return '';
};

export const harvestFieldSelectionMode = (
  campaignFieldOrder: string[]
): 'locked' | 'required' | 'open' => {
  if (campaignFieldOrder.length === 1) return 'locked';
  if (campaignFieldOrder.length > 1) return 'required';
  return 'open';
};
