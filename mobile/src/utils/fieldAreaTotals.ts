import { Field } from '../services/fieldService';
import { formatFieldAreaSqm } from './fieldGeo';

export const sumFieldsAreaSqm = (fields: Field[]): number =>
  fields.reduce((sum, f) => sum + (formatFieldAreaSqm(f) ?? 0), 0);

export const formatTotalFieldsArea = (fields: Field[]): string => {
  const sqm = sumFieldsAreaSqm(fields);
  if (sqm <= 0) return '—';
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(1)} ha`;
  return `${Math.round(sqm)} m²`;
};
