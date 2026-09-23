import {
  convertOliveOilLitresToKg,
  estimateSacksKg,
  extractionYieldPercent,
  formatHarvestOilAmount,
  formatHarvestYieldPercent,
  oilKgFromAmount,
  OLIVE_OIL_KG_PER_LITRE,
  plausibleOilYield,
  settleOil,
} from './harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from './harvestValidation';

describe('harvestCalculations', () => {
  it('converts litres to kg with the documented density', () => {
    expect(OLIVE_OIL_KG_PER_LITRE).toBe(0.916);
    expect(convertOliveOilLitresToKg(100)).toBeCloseTo(91.6, 5);
    expect(oilKgFromAmount(100, 'litres')).toBeCloseTo(91.6, 5);
    expect(oilKgFromAmount(100, 'kg')).toBe(100);
  });

  it('formats yield as a percentage, not mass', () => {
    expect(extractionYieldPercent(1000, 184)).toBeCloseTo(18.4, 5);
    expect(formatHarvestYieldPercent(18.4, 'el')).toMatch(/18[,.]4/);
    expect(formatHarvestYieldPercent(18, 'en')).toBe('18');
  });

  it('hides implausible oil yields', () => {
    expect(plausibleOilYield(18.4)).toBeCloseTo(18.4, 5);
    expect(plausibleOilYield(4)).toBeNull();
    expect(plausibleOilYield(650)).toBeNull();
    expect(plausibleOilYield(null)).toBeNull();
  });

  it('splits one oil total into storage and the mill share', () => {
    const whole = settleOil({
      total: 100,
      unit: 'litres',
      millKept: 0,
      millMode: 'amount',
      tin16Count: 0,
      tin17Count: 0,
      splitTins: false,
    });
    expect(whole.farmerAmount).toBe(100);
    expect(whole.millAmount).toBe(0);
    expect(whole.parts.map((part) => part.key)).toEqual(['stored', 'mill']);

    const mixed = settleOil({
      total: 100,
      unit: 'litres',
      millKept: 10,
      millMode: 'percent',
      tin16Count: 2,
      tin17Count: 1,
      splitTins: true,
    });
    expect(mixed.millAmount).toBe(10);
    expect(mixed.tin16Amount).toBe(32);
    expect(mixed.tin17Amount).toBe(17);
    expect(mixed.bulkAmount).toBe(41);
    expect(mixed.overAmount).toBe(0);
  });

  it('formats oil by unit', () => {
    expect(formatHarvestOilAmount(182, 'litres', 'en')).toMatch(/182/);
    expect(formatHarvestOilAmount(167.2, 'kg', 'en')).toBe('167.2');
  });

  it('estimates sacks kilograms', () => {
    expect(estimateSacksKg(10, 45)).toBe(450);
    expect(estimateSacksKg(0, 45)).toBe(0);
  });
});

describe('harvestValidation', () => {
  it('parses Greek and English decimals', () => {
    expect(parseHarvestDecimal('18,4')).toBe(18.4);
    expect(parseHarvestDecimal('18.4')).toBe(18.4);
    expect(parseHarvestDecimal('')).toBeNull();
  });

  it('detects positive amounts', () => {
    expect(isPositiveAmount(1)).toBe(true);
    expect(isPositiveAmount(0)).toBe(false);
    expect(isPositiveAmount(null)).toBe(false);
  });
});
