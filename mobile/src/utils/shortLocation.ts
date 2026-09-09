/**
 * Compact place name for UI chips and cards.
 * Does not mutate stored address data — callers pass a display string.
 */
export function getShortLocation(location: string | null | undefined): string {
  if (location == null) return '';
  const trimmed = location.trim();
  if (!trimmed) return '';
  const comma = trimmed.indexOf(',');
  if (comma === -1) return trimmed;
  return trimmed.slice(0, comma).trim();
}

export function getFieldShortLocation(field: {
  locationText?: string | null;
  greekCadastre?: { locationFromCadastre?: string | null; municipality?: string | null } | null;
}): string {
  return getShortLocation(
    field.locationText ||
      field.greekCadastre?.locationFromCadastre ||
      field.greekCadastre?.municipality ||
      ''
  );
}
