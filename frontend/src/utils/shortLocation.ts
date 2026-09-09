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

export type LocationSource = {
  locationText?: string | null;
  greekCadastre?: {
    locationFromCadastre?: string | null;
    municipality?: string | null;
  } | null;
};

export function getFieldLocationRaw(field: LocationSource): string {
  return (
    field.locationText ||
    field.greekCadastre?.locationFromCadastre ||
    field.greekCadastre?.municipality ||
    ''
  );
}

export function getFieldShortLocation(field: LocationSource): string {
  return getShortLocation(getFieldLocationRaw(field));
}
