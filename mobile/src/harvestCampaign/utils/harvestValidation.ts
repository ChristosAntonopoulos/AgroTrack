/** Parse decimals that may use `,` or `.` as separator (Greek/English). */
export const parseHarvestDecimal = (raw: string | null | undefined): number | null => {
  if (raw == null) return null;
  const trimmed = raw.trim().replace(/\s|\u00a0/g, '');
  if (!trimmed) return null;
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalized = trimmed;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = trimmed.replace(',', '.');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

export const isPositiveAmount = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value) && value > 0;

export const clampMin = (value: number, min: number): number =>
  Number.isFinite(value) ? Math.max(min, value) : min;
