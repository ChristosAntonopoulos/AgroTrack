import {
  SQM_PER_HECTARE,
  SQM_PER_STREMMA,
  formatAreaFromSqm,
  hectaresFromSqm,
  resolveFieldAreaSqm,
  sqmFromHectares,
  stremmataFromSqm,
} from './area';
import type { Field } from '../services/fieldService';

const field = (partial: Partial<Field>): Field =>
  ({
    id: 'f1',
    ownerId: 'o1',
    name: 'Test',
    area: 0,
    irrigationStatus: false,
    currentLifecycleYear: 'low',
    createdAt: '',
    updatedAt: '',
    ...partial,
  }) as Field;

describe('area conversion', () => {
  it('treats 10,000 m² as 10 stremmata and 1 ha', () => {
    expect(stremmataFromSqm(SQM_PER_HECTARE)).toBe(10);
    expect(hectaresFromSqm(SQM_PER_HECTARE)).toBe(1);
    expect(sqmFromHectares(1)).toBe(SQM_PER_HECTARE);
    expect(SQM_PER_STREMMA * 10).toBe(SQM_PER_HECTARE);
  });

  it('never labels stored square metres as hectares', () => {
    const katsimpali = field({
      name: 'Katsimpali',
      appMeasuredAreaSqm: 3041.7584604638014,
      area: 3041.7584604638014,
    });
    const sqm = resolveFieldAreaSqm(katsimpali);
    expect(sqm).toBeCloseTo(3041.758, 3);
    expect(hectaresFromSqm(sqm!)).toBeCloseTo(0.304, 3);
    const formatted = formatAreaFromSqm(sqm, { locale: 'el', style: 'withConversions' });
    expect(formatted).not.toMatch(/3\.041,76 ha/);
    expect(formatted).not.toMatch(/3041\.7584604638014/);
  });

  it('treats demo Area as hectares when no m² fields exist', () => {
    const north = field({ name: 'North Olive Grove', area: 12.5 });
    expect(resolveFieldAreaSqm(north)).toBe(125000);
    expect(formatAreaFromSqm(125000, { locale: 'el' })).toContain('125');
  });

  it('prefers measured m² over legacy hectares', () => {
    const mixed = field({ area: 12.5, appMeasuredAreaSqm: 13 });
    expect(resolveFieldAreaSqm(mixed)).toBe(13);
  });

  it('uses cadastre official m² when measured area is missing', () => {
    const cadastre = field({
      area: 0,
      greekCadastre: { officialAreaSqm: 3041.76 },
    });
    expect(resolveFieldAreaSqm(cadastre)).toBeCloseTo(3041.76, 2);
  });
});
