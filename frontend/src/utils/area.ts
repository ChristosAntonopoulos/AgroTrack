import type { Field } from '../services/fieldService';
import { localeTagFor, type FormatOptions } from './localeFormatters';

/** Canonical stored/computed unit is square metres. */
export const SQM_PER_HECTARE = 10_000;
export const SQM_PER_STREMMA = 1_000;

export type AreaParts = {
  sqm: number;
  hectares: number;
  stremmata: number;
};

export const sqmFromHectares = (hectares: number): number => hectares * SQM_PER_HECTARE;
export const hectaresFromSqm = (sqm: number): number => sqm / SQM_PER_HECTARE;
export const stremmataFromSqm = (sqm: number): number => sqm / SQM_PER_STREMMA;

const positive = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Resolve a field's area in m².
 * Never infers the unit from magnitude. Preference:
 * 1. explicit areaSqm / appMeasuredAreaSqm (m²)
 * 2. cadastre official area (m²)
 * 3. areaHectares
 * 4. legacy `area` after the API contract (hectares)
 */
export const resolveFieldAreaSqm = (
  field: Pick<Field, 'area' | 'appMeasuredAreaSqm' | 'greekCadastre'> & {
    areaSqm?: number | null;
    areaHectares?: number | null;
  }
): number | undefined => {
  if (positive(field.areaSqm)) return field.areaSqm;
  if (positive(field.appMeasuredAreaSqm)) return field.appMeasuredAreaSqm;
  if (positive(field.greekCadastre?.officialAreaSqm)) return field.greekCadastre!.officialAreaSqm;
  if (positive(field.areaHectares)) return sqmFromHectares(field.areaHectares);
  if (positive(field.area)) return sqmFromHectares(field.area);
  return undefined;
};

export const toAreaParts = (sqm: number): AreaParts => ({
  sqm,
  hectares: hectaresFromSqm(sqm),
  stremmata: stremmataFromSqm(sqm),
});

const roundNice = (value: number, digits: number): number => {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export type AreaFormatStyle = 'primary' | 'withConversions' | 'hectares' | 'sqm';

export const formatAreaFromSqm = (
  sqm: number | null | undefined,
  options: FormatOptions & { style?: AreaFormatStyle } = { locale: 'el' }
): string => {
  if (sqm == null || !Number.isFinite(sqm) || sqm <= 0) return '—';
  const locale = localeTagFor(options.locale);
  const parts = toAreaParts(sqm);
  const style = options.style ?? 'primary';

  const fmt = (value: number, digits: number) =>
    roundNice(value, digits).toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });

  if (style === 'sqm') {
    return `${fmt(parts.sqm, parts.sqm >= 100 ? 0 : 1)} m²`;
  }
  if (style === 'hectares') {
    return `${fmt(parts.hectares, parts.hectares >= 10 ? 2 : 3)} ha`;
  }

  const stremmataDigits = parts.stremmata >= 10 ? 1 : 2;
  const primary =
    options.locale === 'el'
      ? `${fmt(parts.stremmata, stremmataDigits)} στρ.`
      : `${fmt(parts.hectares, parts.hectares >= 10 ? 2 : 3)} ha`;

  if (style === 'withConversions') {
    return `${primary} (${fmt(parts.sqm, 0)} m² · ${fmt(parts.hectares, 3)} ha)`;
  }
  return primary;
};

export const formatFieldArea = (
  field: Parameters<typeof resolveFieldAreaSqm>[0],
  options: FormatOptions & { style?: AreaFormatStyle } = { locale: 'el' }
): string => formatAreaFromSqm(resolveFieldAreaSqm(field), options);

export const formatFieldAreaSqm = (
  field: Parameters<typeof resolveFieldAreaSqm>[0]
): number | undefined => resolveFieldAreaSqm(field);

export const sumFieldsAreaSqm = (
  fields: Array<Parameters<typeof resolveFieldAreaSqm>[0]>
): number => fields.reduce((sum, field) => sum + (resolveFieldAreaSqm(field) ?? 0), 0);
